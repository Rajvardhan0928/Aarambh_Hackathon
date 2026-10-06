import axios from 'axios';
import {
  Scenario,
  SpaceObject,
  ConjunctionSummaryItem,
  ConjunctionDetailResponse,
  OptimizationResult,
  StateVector
} from '../types';
import {
  DEMO_SCENARIOS,
  DEMO_TARGET_SATELLITE,
  DEMO_DEBRIS_LIST,
  DEMO_CONJUNCTIONS,
  DEMO_GRAPH_POINTS,
  DEMO_OPTIMIZATION_RESULT
} from './demoData';

const API_BASE = '/api';
const REQUEST_TIMEOUT_MS = 2500; // 2.5 second strict timeout before demo fallback

const client = axios.create({
  baseURL: API_BASE,
  timeout: REQUEST_TIMEOUT_MS,
});

export let isBackendAvailable = true;

export const api = {
  getHealth: async () => {
    try {
      const res = await client.get('/health');
      isBackendAvailable = true;
      return res.data;
    } catch {
      isBackendAvailable = false;
      return {
        status: "demo_fallback",
        system: "Space Safety & Collision Avoidance Platform (Demo Mode)",
        active_scenario_id: 4,
        disclaimer: "Demonstration / Synthetic Simulation Data"
      };
    }
  },

  getScenarios: async (): Promise<Scenario[]> => {
    try {
      const res = await client.get('/scenarios');
      isBackendAvailable = true;
      return res.data;
    } catch {
      isBackendAvailable = false;
      return DEMO_SCENARIOS;
    }
  },

  startSimulation: async (scenarioId: number) => {
    try {
      const res = await client.post('/simulation/start', { scenario_id: scenarioId });
      isBackendAvailable = true;
      return res.data;
    } catch {
      isBackendAvailable = false;
      return {
        message: `Loaded Demo Scenario ${scenarioId}`,
        scenario_id: scenarioId,
        target_satellite: DEMO_TARGET_SATELLITE,
        debris_count: DEMO_DEBRIS_LIST.length,
        conjunctions_count: DEMO_CONJUNCTIONS.length
      };
    }
  },

  getObjects: async (): Promise<{ target_satellite: SpaceObject; debris_objects: SpaceObject[] }> => {
    try {
      const res = await client.get('/objects');
      isBackendAvailable = true;
      return res.data;
    } catch {
      isBackendAvailable = false;
      return {
        target_satellite: DEMO_TARGET_SATELLITE,
        debris_objects: DEMO_DEBRIS_LIST
      };
    }
  },

  getConjunctions: async (): Promise<ConjunctionSummaryItem[]> => {
    try {
      const res = await client.get('/conjunctions');
      isBackendAvailable = true;
      return res.data;
    } catch {
      isBackendAvailable = false;
      return DEMO_CONJUNCTIONS;
    }
  },

  getConjunctionDetail: async (debrisId: string): Promise<ConjunctionDetailResponse> => {
    try {
      const res = await client.get(`/conjunction/${debrisId}`);
      isBackendAvailable = true;
      return res.data;
    } catch {
      isBackendAvailable = false;
      const foundItem = DEMO_CONJUNCTIONS.find(c => c.conjunction.debris_id === debrisId) || DEMO_CONJUNCTIONS[0];
      return {
        conjunction: foundItem.conjunction,
        risk: foundItem.risk,
        graph_points: DEMO_GRAPH_POINTS,
        optimization_result: debrisId === "DEBRIS_01" ? DEMO_OPTIMIZATION_RESULT : undefined
      };
    }
  },

  propagateObject: async (objectId: string, durationSec: number = 5700, stepSec: number = 60): Promise<{ object_id: string; name: string; trajectory: StateVector[] }> => {
    try {
      const res = await client.post('/propagate', {
        object_id: objectId,
        duration_sec: durationSec,
        step_sec: stepSec
      });
      isBackendAvailable = true;
      return res.data;
    } catch {
      isBackendAvailable = false;
      // Synthesize smooth Keplerian orbit trajectory points for demo view
      const points: StateVector[] = [];
      const numSteps = Math.floor(durationSec / stepSec);
      const isSat = objectId.includes("SAT") || objectId === "SAT_01";
      const altRadius = isSat ? 6928137.0 : (objectId.includes("maneuvered") ? 6934000.0 : 6928300.0);
      const inc = isSat ? 0.90058 : 0.90150;

      for (let i = 0; i < numSteps; i++) {
        const t = i * stepSec;
        const angle = (t / 5700.0) * 2 * Math.PI;
        const x = altRadius * Math.cos(angle);
        const y = altRadius * Math.sin(angle) * Math.cos(inc);
        const z = altRadius * Math.sin(angle) * Math.sin(inc);
        points.push({
          position: [x, y, z],
          velocity: [-7500 * Math.sin(angle), 7500 * Math.cos(angle), 0],
          time_offset: t
        });
      }

      return {
        object_id: objectId,
        name: objectId === "SAT_01" ? "Aarambh-Sat-1" : "Debris Object",
        trajectory: points
      };
    }
  },

  optimizeManeuver: async (satelliteId: string, debrisId: string, safetyThreshold: number = 5000, leadTime: number = 1800): Promise<OptimizationResult> => {
    try {
      const res = await client.post('/maneuver/optimize', {
        satellite_id: satelliteId,
        debris_id: debrisId,
        safety_distance_threshold: safetyThreshold,
        maneuver_lead_time: leadTime,
        isp_sec: 300
      });
      isBackendAvailable = true;
      return res.data;
    } catch {
      isBackendAvailable = false;
      return DEMO_OPTIMIZATION_RESULT;
    }
  },

  uploadTLE: async (name: string, line1: string, line2: string, objectType: string = 'DEBRIS') => {
    try {
      const res = await client.post('/tle/upload', {
        name,
        line1,
        line2,
        object_type: objectType
      });
      isBackendAvailable = true;
      return res.data;
    } catch {
      isBackendAvailable = false;
      return {
        message: `Successfully ingested ${name} (Demo Mode).`,
        object: {
          id: `DEMO_TLE_${Date.now()}`,
          name,
          object_type: objectType,
          position_uncertainty_std: 50.0
        }
      };
    }
  }
};
