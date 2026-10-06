import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, FastForward, RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

import { SpaceObject, ConjunctionResult, ManeuverCandidate } from '../types';
import { api } from '../services/api';

const OMEGA_EARTH = 7.2921159e-5; // Earth rotation rate rad/s

/**
 * Validates whether a value is a finite number.
 */
function isFiniteNumber(val: any): boolean {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Validates whether a position vector represents a valid 3D Cartesian coordinate.
 */
function isValidCartesian(pos: any): boolean {
  if (!pos || !Array.isArray(pos) || pos.length < 3) return false;
  const [x, y, z] = pos;
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) return false;
  const dist = Math.sqrt(x * x + y * y + z * z);
  // Valid Earth orbit distance range: 5,000 km to 100,000 km from Earth center
  return dist > 5000000.0 && dist < 100000000.0;
}

/**
 * Converts Earth-Centered Inertial (ECI) position vector [x, y, z] in meters 
 * to Earth-Centered Earth-Fixed (ECEF) Cesium Cartesian3 vector considering Earth rotation.
 */
function eciToEcef(pos: any, timeOffsetSec: number = 0.0): Cesium.Cartesian3 | null {
  if (!isValidCartesian(pos)) {
    return null;
  }

  const [x, y, z] = pos;
  const theta = OMEGA_EARTH * timeOffsetSec;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const x_ecef = cosT * x + sinT * y;
  const y_ecef = -sinT * x + cosT * y;
  const z_ecef = z;

  return new Cesium.Cartesian3(x_ecef, y_ecef, z_ecef);
}

interface CesiumSpaceViewProps {
  targetSatellite: SpaceObject | null;
  debrisList: SpaceObject[];
  selectedDebrisId: string | null;
  onSelectDebris: (id: string) => void;
  activeConjunction: ConjunctionResult | null;
  recommendedManeuver: ManeuverCandidate | null;
}

export const CesiumSpaceView: React.FC<CesiumSpaceViewProps> = ({
  targetSatellite,
  debrisList,
  selectedDebrisId,
  onSelectDebris,
  activeConjunction,
  recommendedManeuver
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(60);
  const [simTimeSec, setSimTimeSec] = useState<number>(0);
  const [cesiumError, setCesiumError] = useState<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Global window error loggers
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      console.error("GLOBAL WINDOW ERROR:", event.error || event.message);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("UNHANDLED PROMISE REJECTION:", event.reason);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Initialize Cesium Viewer
  useEffect(() => {
    if (!containerRef.current) return;
    if (viewerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    console.log(`CESIUM CONTAINER DIMENSIONS: width = ${width}px, height = ${height}px`);

    try {
      if (typeof window !== 'undefined') {
        (window as any).CESIUM_BASE_URL = '/cesium/';
      }

      Cesium.Ion.defaultAccessToken = '';

      // Initialize Viewer with showRenderLoopErrors: false to prevent default error popup
      const viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        selectionIndicator: true,
        infoBox: true,
        fullscreenButton: false,
        scene3DOnly: true,
        showRenderLoopErrors: false, // STEP 1: Disable Cesium default error popup
        baseLayer: new Cesium.ImageryLayer(
          new Cesium.OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/'
          })
        ),
        skyAtmosphere: new Cesium.SkyAtmosphere(),
      });

      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.depthTestAgainstTerrain = false;

      // STEP 2: Precise renderError listener
      viewer.scene.renderError.addEventListener((scene: any, error: any) => {
        console.error("========== CESIUM RENDER ERROR ==========");
        console.error("Error Object:", error);
        console.error("Error Name:", error?.name);
        console.error("Error Message:", error?.message);
        console.error("Error Stack:", error?.stack);
        console.error("Error String:", String(error));
        console.error("==========================================");

        const errMsg = error?.message || error?.name || String(error);
        setCesiumError(`Cesium Render Exception: ${errMsg}`);
      });

      // Frame camera to Earth & Low Earth Orbit (~18,000 km altitude)
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0.0, 20.0, 18000000.0),
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-90.0),
          roll: 0.0
        }
      });

      viewerRef.current = viewer;
      console.log("CESIUM BASIC VIEWER = PASS");
      setCesiumError(null);
    } catch (err: any) {
      console.error("Cesium Viewer initialization error:", err);
      setCesiumError(err?.message || "WebGL initialization error.");
    }

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Update space objects and orbital polylines in Cesium 3D scene
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !targetSatellite || cesiumError) return;

    try {
      viewer.entities.removeAll();

      // TEST 1 & 2: Target Satellite Point & Orbit
      api.propagateObject(targetSatellite.id, 5700, 60).then((data) => {
        if (!data || !data.trajectory || data.trajectory.length === 0 || !viewerRef.current) return;

        // Print first 5 trajectory points for diagnostic inspection
        console.log(`TARGET TRAJECTORY SAMPLE (First 3 points):`, data.trajectory.slice(0, 3));

        const positions: Cesium.Cartesian3[] = [];
        data.trajectory.forEach((p: any) => {
          const pt = eciToEcef(p.position, p.time_offset);
          if (pt) positions.push(pt);
        });

        // STEP 9: Polyline length check (positions.length >= 2)
        if (positions.length >= 2) {
          viewer.entities.add({
            name: `${targetSatellite.name} Orbit Path`,
            polyline: {
              positions: positions,
              width: 3.0,
              material: Cesium.Color.CYAN,
            },
          });
          console.log("TEST 2: Target Orbit = PASS");
        }

        const currentPt = data.trajectory[0];
        const satPos = eciToEcef(currentPt.position, currentPt.time_offset);
        if (satPos) {
          viewer.entities.add({
            id: targetSatellite.id,
            name: targetSatellite.name,
            position: satPos,
            point: {
              pixelSize: 12,
              color: Cesium.Color.DODGERBLUE,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
            },
            label: {
              text: targetSatellite.name,
              font: '13px bold monospace',
              fillColor: Cesium.Color.CYAN,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              pixelOffset: new Cesium.Cartesian2(0, -18),
            },
          });
          console.log("TEST 1: Target Satellite Point = PASS");
        }
      }).catch(err => console.error("Target propagation error:", err));

      // TEST 3, 4, 5: Debris Objects & Trails
      debrisList.forEach((debris) => {
        const isSelected = debris.id === selectedDebrisId;

        api.propagateObject(debris.id, 5700, 90).then((data) => {
          if (!data || !data.trajectory || data.trajectory.length === 0 || !viewerRef.current) return;

          const positions: Cesium.Cartesian3[] = [];
          data.trajectory.forEach((p: any) => {
            const pt = eciToEcef(p.position, p.time_offset);
            if (pt) positions.push(pt);
          });

          if (positions.length >= 2) {
            const color = isSelected ? Cesium.Color.RED : Cesium.Color.ORANGE.withAlpha(0.65);
            viewer.entities.add({
              name: `${debris.name} Trail`,
              polyline: {
                positions: positions,
                width: isSelected ? 3.5 : 1.5,
                material: color,
              },
            });
          }

          const currentPt = data.trajectory[0];
          const debPos = eciToEcef(currentPt.position, currentPt.time_offset);
          if (debPos) {
            viewer.entities.add({
              id: debris.id,
              name: debris.name,
              position: debPos,
              point: {
                pixelSize: isSelected ? 11 : 7,
                color: isSelected ? Cesium.Color.RED : Cesium.Color.ORANGERED,
                outlineColor: isSelected ? Cesium.Color.YELLOW : Cesium.Color.BLACK,
                outlineWidth: isSelected ? 3 : 1,
              },
              label: isSelected
                ? {
                    text: `⚠️ ${debris.name}`,
                    font: '12px bold monospace',
                    fillColor: Cesium.Color.YELLOW,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    pixelOffset: new Cesium.Cartesian2(0, -18),
                  }
                : undefined,
            });
          }
        }).catch(err => console.error(`Debris ${debris.id} propagation error:`, err));
      });

      // TEST 6: TCA Marker
      if (activeConjunction && isValidCartesian(activeConjunction.sat_position_at_tca)) {
        const tcaPt = eciToEcef(activeConjunction.sat_position_at_tca, activeConjunction.tca);
        if (tcaPt) {
          viewer.entities.add({
            name: `Conjunction TCA Marker`,
            position: tcaPt,
            point: {
              pixelSize: 16,
              color: Cesium.Color.YELLOW,
              outlineColor: Cesium.Color.RED,
              outlineWidth: 4,
            },
            label: {
              text: `⚠️ CONJUNCTION TCA (${activeConjunction.min_distance.toFixed(0)}m)`,
              font: '14px bold monospace',
              fillColor: Cesium.Color.YELLOW,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              pixelOffset: new Cesium.Cartesian2(0, 22),
            },
          });
          console.log("TEST 6: TCA Marker = PASS");
        }
      }

      // TEST 7: Avoidance Trajectory Path
      if (selectedDebrisId && recommendedManeuver) {
        api.propagateObject(`${targetSatellite.id}_maneuvered`, 5700, 60).then((data) => {
          if (data && data.trajectory && data.trajectory.length > 0 && viewerRef.current) {
            const positions: Cesium.Cartesian3[] = [];
            data.trajectory.forEach((p: any) => {
              const pt = eciToEcef(p.position, p.time_offset);
              if (pt) positions.push(pt);
            });

            if (positions.length >= 2) {
              viewer.entities.add({
                name: `Post-Maneuver Avoidance Orbit`,
                polyline: {
                  positions: positions,
                  width: 3.5,
                  material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.LIME,
                    dashLength: 16.0,
                  }),
                },
              });
              console.log("TEST 7: Avoidance Trajectory = PASS");
            }
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Error updating Cesium entities:", err);
    }
  }, [targetSatellite, debrisList, selectedDebrisId, activeConjunction, recommendedManeuver, cesiumError]);

  // Simulation loop animation handler
  useEffect(() => {
    let lastTime = performance.now();

    const updateLoop = (now: number) => {
      const deltaSec = (now - lastTime) / 1000.0;
      lastTime = now;

      if (isPlaying) {
        setSimTimeSec((prev) => (prev + deltaSec * speedMultiplier) % 86400);
      }

      animFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animFrameRef.current = requestAnimationFrame(updateLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speedMultiplier]);

  const resetCamera = () => {
    if (viewerRef.current) {
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(0.0, 20.0, 18000000.0),
        duration: 1.5
      });
    }
  };

  const handleRetryCesium = () => {
    setCesiumError(null);
    window.location.reload();
  };

  return (
    <div className="relative w-full h-[520px] bg-space-900 rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
      {/* Cesium Viewer Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Graceful Fallback Notice if WebGL/Cesium initialization fails */}
      {cesiumError && (
        <div className="absolute inset-0 bg-space-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20 font-sans">
          <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              3D Visualization Status Notice
            </h4>
            <p className="text-xs text-red-300 font-mono max-w-md mt-1 border border-red-900/50 bg-black/40 p-2 rounded">
              {cesiumError}
            </p>
          </div>
          <button
            onClick={handleRetryCesium}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RETRY 3D VIEW</span>
          </button>
        </div>
      )}

      {/* Floating Simulation Controls */}
      {!cesiumError && (
        <>
          <div className="absolute top-4 left-4 z-10 bg-space-800/90 backdrop-blur-md border border-gray-700/80 rounded-lg p-3 flex items-center space-x-3 shadow-lg">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-space-accent hover:bg-blue-600 text-white rounded-md transition duration-150 flex items-center space-x-1"
              title={isPlaying ? "Pause Simulation" : "Play Simulation"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="text-xs font-semibold">{isPlaying ? "PAUSE" : "PLAY"}</span>
            </button>

            <div className="h-6 w-px bg-gray-700" />

            <div className="flex items-center space-x-1">
              <FastForward className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-mono text-gray-300">SPEED:</span>
              {[1, 10, 60, 300].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedMultiplier(s)}
                  className={`px-2 py-1 text-xs font-mono rounded ${
                    speedMultiplier === s
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-space-700 text-gray-300 hover:bg-space-600'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-gray-700" />

            <button
              onClick={resetCamera}
              className="p-1.5 bg-space-700 hover:bg-space-600 text-gray-300 rounded-md transition flex items-center space-x-1 text-xs"
              title="Reset 3D Globe Camera"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset View</span>
            </button>
          </div>

          {/* 3D View Status Overlay Legend */}
          <div className="absolute bottom-4 right-4 z-10 bg-space-800/90 backdrop-blur-md border border-gray-700/80 rounded-lg p-3 text-xs space-y-1.5 shadow-lg">
            <div className="font-semibold text-gray-300 tracking-wider text-[11px] uppercase mb-1">
              3D Orbital Legend
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className="text-gray-200">Target Orbit (Cyan)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-200">Debris Threat (Red/Orange)</span>
            </div>
            {activeConjunction && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400 animate-ping" />
                <span className="text-yellow-300 font-medium">TCA Conjunction Marker</span>
              </div>
            )}
            {recommendedManeuver && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-emerald-300 font-medium">Avoidance Path (Lime Dashed)</span>
              </div>
            )}
          </div>

          {/* Simulation Clock Indicator */}
          <div className="absolute bottom-4 left-4 z-10 bg-space-800/90 backdrop-blur-md border border-gray-700/80 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 shadow-lg flex items-center space-x-2">
            <span className="text-blue-400 font-bold">SIM TIME:</span>
            <span>{Math.floor(simTimeSec / 3600)}h {Math.floor((simTimeSec % 3600) / 60)}m {Math.floor(simTimeSec % 60)}s</span>
          </div>
        </>
      )}
    </div>
  );
};
