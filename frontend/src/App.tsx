import React, { useEffect, useState } from 'react';
import { api, isBackendAvailable } from './services/api';
import {
  SpaceObject,
  ConjunctionSummaryItem,
  Scenario,
  ConjunctionDetailResponse,
  OptimizationResult
} from './types';
import {
  DEMO_SCENARIOS,
  DEMO_TARGET_SATELLITE,
  DEMO_DEBRIS_LIST,
  DEMO_CONJUNCTIONS,
  DEMO_GRAPH_POINTS,
  DEMO_OPTIMIZATION_RESULT
} from './services/demoData';
import { OverviewDashboard } from './components/OverviewDashboard';
import { CesiumSpaceView } from './components/CesiumSpaceView';
import { ConjunctionTable } from './components/ConjunctionTable';
import { TrajectoryGraph } from './components/TrajectoryGraph';
import { RiskPanel } from './components/RiskPanel';
import { ManeuverPanel } from './components/ManeuverPanel';
import { TLEUploadModal } from './components/TLEUploadModal';
import { PlayCircle } from 'lucide-react';

export function App() {
  // Initialize with immediate deterministic demo data for guaranteed 0ms rendering
  const [scenarios, setScenarios] = useState<Scenario[]>(DEMO_SCENARIOS);
  const [activeScenarioId, setActiveScenarioId] = useState<number>(4);
  const [targetSatellite, setTargetSatellite] = useState<SpaceObject>(DEMO_TARGET_SATELLITE);
  const [debrisList, setDebrisList] = useState<SpaceObject[]>(DEMO_DEBRIS_LIST);
  const [conjunctions, setConjunctions] = useState<ConjunctionSummaryItem[]>(DEMO_CONJUNCTIONS);
  const [selectedDebrisId, setSelectedDebrisId] = useState<string>("DEBRIS_01");
  const [detailResponse, setDetailResponse] = useState<ConjunctionDetailResponse>({
    conjunction: DEMO_CONJUNCTIONS[0].conjunction,
    risk: DEMO_CONJUNCTIONS[0].risk,
    graph_points: DEMO_GRAPH_POINTS,
    optimization_result: DEMO_OPTIMIZATION_RESULT
  });
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(DEMO_OPTIMIZATION_RESULT);

  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isTLEModalOpen, setIsTLEModalOpen] = useState<boolean>(false);
  const [demoBanner, setDemoBanner] = useState<string | null>(null);

  // Background non-blocking sync with backend (if available)
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const scList = await api.getScenarios();
      setScenarios(scList);
      await loadScenario(4);
    } catch (err) {
      console.warn('Backend offline or delayed — operating in standalone Demo Mode:', err);
    }
  };

  const loadScenario = async (scenarioId: number) => {
    try {
      setActiveScenarioId(scenarioId);
      await api.startSimulation(scenarioId);

      const objs = await api.getObjects();
      setTargetSatellite(objs.target_satellite);
      setDebrisList(objs.debris_objects);

      const conjs = await api.getConjunctions();
      setConjunctions(conjs);

      if (conjs.length > 0) {
        const sorted = [...conjs].sort(
          (a, b) => (b.risk?.risk_score || 0) - (a.risk?.risk_score || 0)
        );
        const topDebrisId = sorted[0].conjunction.debris_id;
        setSelectedDebrisId(topDebrisId);
        await selectDebris(topDebrisId);
      }
    } catch (err) {
      console.warn(`Scenario ${scenarioId} loaded in Demo Mode fallback.`);
    }
  };

  const selectDebris = async (debrisId: string) => {
    setSelectedDebrisId(debrisId);
    try {
      const detail = await api.getConjunctionDetail(debrisId);
      setDetailResponse(detail);
      setOptimizationResult(detail.optimization_result || null);
    } catch (err) {
      // Demo fallback detail lookup
      const foundItem = DEMO_CONJUNCTIONS.find(c => c.conjunction.debris_id === debrisId) || DEMO_CONJUNCTIONS[0];
      setDetailResponse({
        conjunction: foundItem.conjunction,
        risk: foundItem.risk,
        graph_points: DEMO_GRAPH_POINTS,
        optimization_result: debrisId === "DEBRIS_01" || debrisId === "DEBRIS_401" ? DEMO_OPTIMIZATION_RESULT : undefined
      });
      if (debrisId === "DEBRIS_01" || debrisId === "DEBRIS_401") {
        setOptimizationResult(DEMO_OPTIMIZATION_RESULT);
      } else {
        setOptimizationResult(null);
      }
    }
  };

  const handleOptimizeManeuver = async () => {
    if (!targetSatellite || !selectedDebrisId) return;
    setIsOptimizing(true);
    try {
      const result = await api.optimizeManeuver(targetSatellite.id, selectedDebrisId, 5000, 1800);
      setOptimizationResult(result);
      await selectDebris(selectedDebrisId);
    } catch (err) {
      setOptimizationResult(DEMO_OPTIMIZATION_RESULT);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Hackathon Demo Mode 1-click Runner
  const handleStartDemoMode = async () => {
    setDemoBanner("🚀 HACKATHON DEMO: Step 1/4 — Loading Scenario 4 (Multi-Debris Master Scenario)...");
    await loadScenario(4);

    setTimeout(async () => {
      setDemoBanner("⚠️ HACKATHON DEMO: Step 2/4 — Critical Threat Detected: Cosmos-1408 Fragment #401 (Miss Dist: ~189m, Risk: CRITICAL)...");
      const critId = debrisList[0]?.id || "DEBRIS_01";
      setSelectedDebrisId(critId);
      await selectDebris(critId);

      setTimeout(async () => {
        setDemoBanner("⚡ HACKATHON DEMO: Step 3/4 — Computing Low-Energy Orbital Avoidance Maneuver in RTN Frame...");
        setIsOptimizing(true);
        const result = await api.optimizeManeuver(targetSatellite.id, critId, 5000, 1800);
        setOptimizationResult(result);
        await selectDebris(critId);
        setIsOptimizing(false);

        setTimeout(() => {
          setDemoBanner("✅ HACKATHON DEMO COMPLETE: Minimum ΔV +Transverse burn selected! Miss distance expanded > 5 km. Post-burn trajectory active in 3D View.");
        }, 1200);
      }, 1500);
    }, 1500);
  };

  const handleResetDemo = () => {
    setScenarios(DEMO_SCENARIOS);
    setActiveScenarioId(4);
    setTargetSatellite(DEMO_TARGET_SATELLITE);
    setDebrisList(DEMO_DEBRIS_LIST);
    setConjunctions(DEMO_CONJUNCTIONS);
    setSelectedDebrisId("DEBRIS_01");
    setDetailResponse({
      conjunction: DEMO_CONJUNCTIONS[0].conjunction,
      risk: DEMO_CONJUNCTIONS[0].risk,
      graph_points: DEMO_GRAPH_POINTS,
      optimization_result: DEMO_OPTIMIZATION_RESULT
    });
    setOptimizationResult(DEMO_OPTIMIZATION_RESULT);
    setDemoBanner(null);
  };

  return (
    <div className="min-h-screen bg-space-900 text-gray-100 p-4 md:p-6 font-sans space-y-6">
      {/* Hackathon Demo Banner */}
      {demoBanner && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center justify-between font-mono text-xs font-bold animate-pulse">
          <div className="flex items-center space-x-2">
            <PlayCircle className="w-5 h-5" />
            <span>{demoBanner}</span>
          </div>
          <button onClick={() => setDemoBanner(null)} className="text-white/80 hover:text-white text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Dashboard Banner & KPI Cards */}
      <OverviewDashboard
        targetSatellite={targetSatellite}
        debrisCount={debrisList.length}
        conjunctions={conjunctions}
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        isDemoMode={!isBackendAvailable}
        onSelectScenario={loadScenario}
        onStartDemoMode={handleStartDemoMode}
        onResetDemo={handleResetDemo}
        onOpenTLEModal={() => setIsTLEModalOpen(true)}
      />

      {/* Main 3D Space View & Controls Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CesiumSpaceView
            targetSatellite={targetSatellite}
            debrisList={debrisList}
            selectedDebrisId={selectedDebrisId}
            onSelectDebris={selectDebris}
            activeConjunction={detailResponse?.conjunction || null}
            recommendedManeuver={optimizationResult?.recommended_maneuver || null}
          />
        </div>

        {/* Risk Analysis Panel */}
        <div className="lg:col-span-1">
          <RiskPanel risk={detailResponse?.risk || null} />
        </div>
      </div>

      {/* Conjunction Table & Trajectory Distance Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConjunctionTable
          conjunctions={conjunctions}
          selectedDebrisId={selectedDebrisId}
          onSelectDebris={selectDebris}
        />

        <TrajectoryGraph
          graphPoints={detailResponse?.graph_points || []}
          tcaSec={detailResponse?.conjunction.tca || 0}
          minDistanceM={detailResponse?.conjunction.min_distance || 0}
          hasManeuver={!!optimizationResult}
        />
      </div>

      {/* Avoidance Maneuver Optimization Panel */}
      <ManeuverPanel
        optimizationResult={optimizationResult}
        onOptimize={handleOptimizeManeuver}
        isOptimizing={isOptimizing}
      />

      {/* Modal for Ingesting Custom TLE Lines */}
      <TLEUploadModal
        isOpen={isTLEModalOpen}
        onClose={() => setIsTLEModalOpen(false)}
        onSuccess={() => loadScenario(activeScenarioId)}
      />

      {/* Footer */}
      <footer className="text-center text-gray-500 text-xs py-4 border-t border-gray-800/80 font-mono">
        Aarambh College Hackathon Prototype • Orbital Dynamics & Space Safety • Python FastAPI + React + CesiumJS
      </footer>
    </div>
  );
}

export default App;
