import math
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from scipy.optimize import minimize_scalar
from pydantic import BaseModel

from app.simulation.orbit_engine import SpaceObject, StateVector
from app.simulation.propagator import propagate_object_state

class ConjunctionResult(BaseModel):
    satellite_id: str
    debris_id: str
    debris_name: str
    tca: float                         # Time of Closest Approach (seconds from epoch)
    min_distance: float                # Minimum separation distance in meters
    relative_velocity: float           # Relative speed magnitude at TCA (m/s)
    relative_position_vec: Tuple[float, float, float] # (m)
    relative_velocity_vec: Tuple[float, float, float] # (m/s)
    sat_position_at_tca: Tuple[float, float, float]   # (m)
    sat_velocity_at_tca: Tuple[float, float, float]   # (m/s)
    debris_position_at_tca: Tuple[float, float, float]# (m)
    debris_velocity_at_tca: Tuple[float, float, float]# (m/s)

def compute_relative_distance(t: float, sat: SpaceObject, debris: SpaceObject) -> float:
    """
    Computes Euclidean distance between satellite and debris at time t.
    """
    r_sat, _ = propagate_object_state(sat, t)
    r_deb, _ = propagate_object_state(debris, t)
    return float(np.linalg.norm(r_deb - r_sat))

def analyze_conjunction(
    sat: SpaceObject,
    debris: SpaceObject,
    start_time: float = 0.0,
    end_time: float = 86400.0, # 24 hours propagation window by default
    coarse_step: float = 30.0   # 30 second initial sampling
) -> ConjunctionResult:
    """
    Finds the exact Time of Closest Approach (TCA) and min distance between satellite and debris.
    Uses coarse grid sampling followed by Brent's method scalar optimization for sub-millisecond TCA precision.
    """
    t_samples = np.arange(start_time, end_time, coarse_step)
    if len(t_samples) == 0 or t_samples[-1] < end_time:
        t_samples = np.append(t_samples, end_time)
        
    min_coarse_dist = float('inf')
    best_t_idx = 0
    distances = []
    
    for idx, t in enumerate(t_samples):
        d = compute_relative_distance(t, sat, debris)
        distances.append(d)
        if d < min_coarse_dist:
            min_coarse_dist = d
            best_t_idx = idx
            
    # Define search bounds around the coarse minimum
    t_min_bound = max(start_time, t_samples[best_t_idx] - coarse_step)
    t_max_bound = min(end_time, t_samples[best_t_idx] + coarse_step)
    
    # Precise Brent optimization
    res = minimize_scalar(
        compute_relative_distance,
        args=(sat, debris),
        bounds=(t_min_bound, t_max_bound),
        method='bounded',
        options={'xatol': 1e-4}
    )
    
    tca = float(res.x)
    min_dist = float(res.fun)
    
    # State vectors at exact TCA
    r_sat, v_sat = propagate_object_state(sat, tca)
    r_deb, v_deb = propagate_object_state(debris, tca)
    
    r_rel = r_deb - r_sat
    v_rel = v_deb - v_sat
    rel_speed = float(np.linalg.norm(v_rel))
    
    return ConjunctionResult(
        satellite_id=sat.id,
        debris_id=debris.id,
        debris_name=debris.name,
        tca=tca,
        min_distance=min_dist,
        relative_velocity=rel_speed,
        relative_position_vec=(float(r_rel[0]), float(r_rel[1]), float(r_rel[2])),
        relative_velocity_vec=(float(v_rel[0]), float(v_rel[1]), float(v_rel[2])),
        sat_position_at_tca=(float(r_sat[0]), float(r_sat[1]), float(r_sat[2])),
        sat_velocity_at_tca=(float(v_sat[0]), float(v_sat[1]), float(v_sat[2])),
        debris_position_at_tca=(float(r_deb[0]), float(r_deb[1]), float(r_deb[2])),
        debris_velocity_at_tca=(float(v_deb[0]), float(v_deb[1]), float(v_deb[2]))
    )

def analyze_all_conjunctions(
    sat: SpaceObject,
    debris_list: List[SpaceObject],
    start_time: float = 0.0,
    end_time: float = 86400.0
) -> List[ConjunctionResult]:
    """
    Runs conjunction analysis for a target satellite against multiple debris objects.
    """
    results = []
    for deb in debris_list:
        res = analyze_conjunction(sat, deb, start_time=start_time, end_time=end_time)
        results.append(res)
    # Sort by minimum distance ascending
    results.sort(key=lambda x: x.min_distance)
    return results
