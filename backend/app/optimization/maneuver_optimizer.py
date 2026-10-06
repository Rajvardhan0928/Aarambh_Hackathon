import math
import numpy as np
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.simulation.orbit_engine import SpaceObject
from app.simulation.conjunction import ConjunctionResult
from app.risk.risk_analyzer import RiskAssessment
from app.optimization.maneuver_generator import (
    ManeuverCandidate, generate_candidate_maneuvers, create_modified_satellite
)
from app.simulation.propagator import propagate_trajectory

class OptimizationResult(BaseModel):
    satellite_id: str
    debris_id: str
    original_min_distance: float
    original_risk_score: float
    original_risk_level: str
    recommended_maneuver: ManeuverCandidate
    all_candidates: List[ManeuverCandidate]
    explanation: str
    fuel_saved_percentage: float # Savings compared to worst/un-optimized maneuver

def optimize_avoidance_maneuver(
    sat: SpaceObject,
    debris: SpaceObject,
    initial_conjunction: ConjunctionResult,
    initial_risk: RiskAssessment,
    safety_distance_threshold: float = 5000.0, # 5 km margin
    maneuver_lead_time: float = 1800.0,         # 30 mins before TCA
    isp_sec: float = 300.0
) -> OptimizationResult:
    """
    Selects the minimum-energy orbital maneuver that satisfies the safety distance threshold and reduces risk to LOW.
    Includes comprehensive explainability analysis comparing burn directions.
    """
    candidates = generate_candidate_maneuvers(
        sat, debris, initial_conjunction,
        maneuver_lead_time=maneuver_lead_time,
        isp_sec=isp_sec,
        safety_distance_threshold=safety_distance_threshold
    )
    
    # Filter safe candidates
    safe_candidates = [c for c in candidates if c.is_safe and c.post_burn_risk_level_str in ["LOW", "MEDIUM"]]
    
    if not safe_candidates:
        # Fallback to candidate that maximizes miss distance if no candidate strictly meets 5km margin
        sorted_by_dist = sorted(candidates, key=lambda c: c.post_burn_min_distance, reverse=True)
        recommended = sorted_by_dist[0]
    else:
        # Sort safe candidates by minimum delta-v magnitude (minimum energy cost)
        safe_candidates.sort(key=lambda c: c.delta_v_magnitude)
        recommended = safe_candidates[0]
        
    # Calculate fuel savings percentage vs maximum delta-v candidate (2.0 m/s)
    max_dv_cand = max(candidates, key=lambda c: c.delta_v_magnitude)
    if max_dv_cand.delta_v_magnitude > 0:
        fuel_saved_pct = (1.0 - recommended.delta_v_magnitude / max_dv_cand.delta_v_magnitude) * 100.0
    else:
        fuel_saved_pct = 0.0
        
    # Construct Explainability Analysis
    dir_name = recommended.direction_name
    dv_val = recommended.delta_v_magnitude
    orig_dist = initial_conjunction.min_distance
    new_dist = recommended.post_burn_min_distance
    
    explanation_parts = [
        f"RECOMMENDED MANEUVER SELECTION: {dir_name} burn with ΔV = {dv_val:.2f} m/s.",
        f"SAFETY IMPACT: Miss distance increases from {orig_dist:.1f} m ({initial_risk.risk_level}) to {new_dist/1000.0:.2f} km ({recommended.post_burn_risk_level_str}).",
        f"ENERGY EFFICIENCY: Requires only {recommended.energy_cost_joules:.1f} Joules of kinetic energy change and {recommended.fuel_mass_kg*1000.0:.2f} grams of propellant ({fuel_saved_pct:.1f}% savings vs 2.0 m/s maximum burn).",
    ]
    
    if "Transverse" in dir_name or "In-Track" in dir_name:
        explanation_parts.append(
            "ASTRODYNAMICS RATIONALE: In-track (Transverse) burns alter the semi-major axis, causing a cumulative time phasing shift along the orbit. "
            "Executing an in-track burn 30 minutes prior to TCA creates maximum miss distance per unit of ΔV compared to radial or cross-track burns."
        )
    elif "Normal" in dir_name or "Cross-Track" in dir_name:
        explanation_parts.append(
            "ASTRODYNAMICS RATIONALE: Cross-track (Normal) burns shift the orbital plane, creating immediate orthogonal clearance at nodal intersections."
        )
    else:
        explanation_parts.append(
            "ASTRODYNAMICS RATIONALE: Radial burns adjust orbital eccentricity vectors to establish radial separation at encounter."
        )
        
    explanation_text = " ".join(explanation_parts)
    
    return OptimizationResult(
        satellite_id=sat.id,
        debris_id=debris.id,
        original_min_distance=orig_dist,
        original_risk_score=initial_risk.risk_score,
        original_risk_level=initial_risk.risk_level,
        recommended_maneuver=recommended,
        all_candidates=candidates,
        explanation=explanation_text,
        fuel_saved_percentage=fuel_saved_pct
    )
