from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np

from app.simulation.orbit_engine import SpaceObject, OrbitalElements
from app.simulation.propagator import propagate_trajectory, propagate_object_state
from app.simulation.conjunction import analyze_conjunction, analyze_all_conjunctions, ConjunctionResult
from app.risk.risk_analyzer import calculate_risk_assessment, RiskAssessment
from app.optimization.maneuver_generator import generate_candidate_maneuvers, ManeuverCandidate, create_modified_satellite
from app.optimization.maneuver_optimizer import optimize_avoidance_maneuver, OptimizationResult
from app.simulation.scenarios import generate_scenario_debris, get_target_satellite

router = APIRouter()

# In-memory store for active simulation state
class SimulationStore:
    def __init__(self):
        self.active_scenario_id: int = 4
        self.target_satellite: SpaceObject = get_target_satellite()
        self.debris_objects: List[SpaceObject] = []
        self.conjunctions: List[ConjunctionResult] = []
        self.risks: Dict[str, RiskAssessment] = {} # Keyed by debris_id
        self.optimization_results: Dict[str, OptimizationResult] = {} # Keyed by debris_id
        self.maneuvered_satellites: Dict[str, SpaceObject] = {} # Keyed by debris_id
        
        # Initialize default master scenario 4
        self.load_scenario(4)
        
    def load_scenario(self, scenario_id: int):
        self.active_scenario_id = scenario_id
        self.target_satellite, self.debris_objects = generate_scenario_debris(scenario_id)
        self.conjunctions = analyze_all_conjunctions(
            self.target_satellite, self.debris_objects, start_time=0.0, end_time=86400.0
        )
        self.risks = {}
        self.optimization_results = {}
        self.maneuvered_satellites = {}
        
        for conj in self.conjunctions:
            # find corresponding debris
            deb = next((d for d in self.debris_objects if d.id == conj.debris_id), None)
            if deb:
                risk = calculate_risk_assessment(conj, self.target_satellite, deb)
                self.risks[deb.id] = risk

store = SimulationStore()

# Request schemas
class StartSimulationRequest(BaseModel):
    scenario_id: int = 4

class PropagateRequest(BaseModel):
    object_id: str
    duration_sec: float = 86400.0
    step_sec: float = 60.0

class ConjunctionRequest(BaseModel):
    satellite_id: str
    debris_id: str
    start_time: float = 0.0
    end_time: float = 86400.0

class OptimizeRequest(BaseModel):
    satellite_id: str
    debris_id: str
    safety_distance_threshold: float = 5000.0 # meters
    maneuver_lead_time: float = 1800.0        # seconds before TCA
    isp_sec: float = 300.0                    # seconds

class TLEUploadRequest(BaseModel):
    name: str
    line1: str
    line2: str
    object_type: str = "DEBRIS"

@router.get("/health")
def health_check():
    return {
        "status": "online",
        "system": "Space Safety & Collision Avoidance Platform Backend",
        "active_scenario_id": store.active_scenario_id,
        "disclaimer": "Prototype Scientific Engine for Educational/Hackathon Demonstration"
    }

@router.get("/scenarios")
def get_scenarios():
    return [
        {
            "id": 1,
            "name": "Scenario 1: Normal Space Traffic",
            "description": "Clear orbital environment. All space debris objects maintain safe miss distances (> 10 km).",
            "risk_level": "LOW"
        },
        {
            "id": 2,
            "name": "Scenario 2: Medium-Risk Conjunction",
            "description": "FENGYUN 1C fragment approaching within ~2.6 km. Triggers medium alert status.",
            "risk_level": "MEDIUM"
        },
        {
            "id": 3,
            "name": "Scenario 3: Critical Conjunction Threat",
            "description": "CZ-4C fragment approaching within ~200 meters. Demands immediate collision avoidance maneuver.",
            "risk_level": "CRITICAL"
        },
        {
            "id": 4,
            "name": "Scenario 4: Multi-Debris Complex Traffic (Master Demo)",
            "description": "10 tracked debris fragments surrounding Aarambh-Sat-1, featuring 1 Critical threat (~190m), 1 Medium risk (~3.2km), and 8 safe background objects.",
            "risk_level": "CRITICAL"
        }
    ]

@router.post("/simulation/start")
def start_simulation(req: StartSimulationRequest):
    if req.scenario_id not in [1, 2, 3, 4]:
        raise HTTPException(status_code=400, detail="Invalid scenario_id. Must be 1, 2, 3, or 4.")
    store.load_scenario(req.scenario_id)
    return {
        "message": f"Loaded Scenario {req.scenario_id}",
        "scenario_id": req.scenario_id,
        "target_satellite": store.target_satellite,
        "debris_count": len(store.debris_objects),
        "conjunctions_count": len(store.conjunctions)
    }

@router.get("/objects")
def get_objects():
    return {
        "target_satellite": store.target_satellite,
        "debris_objects": store.debris_objects
    }

@router.post("/propagate")
def propagate_object(req: PropagateRequest):
    obj = None
    if req.object_id == store.target_satellite.id:
        obj = store.target_satellite
    elif req.object_id in store.maneuvered_satellites:
        obj = store.maneuvered_satellites[req.object_id]
    else:
        obj = next((d for d in store.debris_objects if d.id == req.object_id), None)
        
    if not obj:
        raise HTTPException(status_code=404, detail=f"Space object '{req.object_id}' not found.")
        
    trajectory = propagate_trajectory(obj, start_time=0.0, end_time=req.duration_sec, step_sec=req.step_sec)
    return {
        "object_id": obj.id,
        "name": obj.name,
        "points_count": len(trajectory),
        "trajectory": trajectory
    }

@router.get("/conjunctions")
def get_conjunctions():
    summary_list = []
    for conj in store.conjunctions:
        risk = store.risks.get(conj.debris_id)
        summary_list.append({
            "conjunction": conj,
            "risk": risk
        })
    return summary_list

@router.get("/conjunction/{debris_id}")
def get_conjunction_detail(debris_id: str):
    conj = next((c for c in store.conjunctions if c.debris_id == debris_id), None)
    if not conj:
        raise HTTPException(status_code=404, detail=f"Conjunction for debris '{debris_id}' not found.")
        
    risk = store.risks.get(debris_id)
    deb = next((d for d in store.debris_objects if d.id == debris_id), None)
    
    # Generate distance-vs-time trajectory points around TCA (-1800s to +1800s)
    tca = conj.tca
    t_start = max(0.0, tca - 1800.0)
    t_end = tca + 1800.0
    t_step = 30.0
    
    graph_points = []
    t = t_start
    while t <= t_end:
        r_s, _ = propagate_object_state(store.target_satellite, t)
        r_d, _ = propagate_object_state(deb, t)
        dist = float(np.linalg.norm(r_d - r_s))
        
        # Check if maneuvered trajectory exists
        maneuver_dist = None
        if debris_id in store.maneuvered_satellites:
            sat_m = store.maneuvered_satellites[debris_id]
            r_sm, _ = propagate_object_state(sat_m, t)
            maneuver_dist = float(np.linalg.norm(r_d - r_sm))
            
        graph_points.append({
            "time_offset": round(t, 1),
            "time_to_tca_mins": round((t - tca) / 60.0, 2),
            "distance_m": round(dist, 1),
            "post_maneuver_distance_m": round(maneuver_dist, 1) if maneuver_dist is not None else None
        })
        t += t_step
        
    opt_result = store.optimization_results.get(debris_id)
    
    return {
        "conjunction": conj,
        "risk": risk,
        "graph_points": graph_points,
        "optimization_result": opt_result
    }

@router.post("/risk/analyze")
def analyze_risk_post(req: ConjunctionRequest):
    conj = analyze_conjunction(store.target_satellite, next(d for d in store.debris_objects if d.id == req.debris_id), req.start_time, req.end_time)
    deb = next(d for d in store.debris_objects if d.id == req.debris_id)
    risk = calculate_risk_assessment(conj, store.target_satellite, deb)
    return risk

@router.post("/maneuver/optimize")
def optimize_maneuver_post(req: OptimizeRequest):
    deb = next((d for d in store.debris_objects if d.id == req.debris_id), None)
    if not deb:
        raise HTTPException(status_code=404, detail=f"Debris '{req.debris_id}' not found.")
        
    conj = next((c for c in store.conjunctions if c.debris_id == req.debris_id), None)
    if not conj:
        conj = analyze_conjunction(store.target_satellite, deb)
        
    risk = store.risks.get(req.debris_id)
    if not risk:
        risk = calculate_risk_assessment(conj, store.target_satellite, deb)
        
    opt_result = optimize_avoidance_maneuver(
        store.target_satellite,
        deb,
        conj,
        risk,
        safety_distance_threshold=req.safety_distance_threshold,
        maneuver_lead_time=req.maneuver_lead_time,
        isp_sec=req.isp_sec
    )
    
    # Store recommended maneuvered satellite state for visualization
    rec = opt_result.recommended_maneuver
    sat_post = create_modified_satellite(store.target_satellite, rec.maneuver_time_offset, np.array(rec.eci_delta_v))
    
    store.optimization_results[req.debris_id] = opt_result
    store.maneuvered_satellites[req.debris_id] = sat_post
    
    return opt_result

@router.post("/tle/upload")
def upload_tle(req: TLEUploadRequest):
    new_id = f"TLE_{len(store.debris_objects)+1:03d}"
    new_obj = SpaceObject(
        id=new_id,
        name=req.name,
        object_type=req.object_type,
        tle_line1=req.line1,
        tle_line2=req.line2
    )
    if req.object_type == "SATELLITE":
        store.target_satellite = new_obj
    else:
        store.debris_objects.append(new_obj)
        
    # Re-analyze conjunctions
    store.conjunctions = analyze_all_conjunctions(store.target_satellite, store.debris_objects)
    return {
        "message": f"Successfully added {req.name} via TLE.",
        "object": new_obj
    }
