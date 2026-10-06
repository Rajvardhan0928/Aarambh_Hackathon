import math
import numpy as np
from typing import List, Dict, Any
from pydantic import BaseModel

from app.simulation.conjunction import ConjunctionResult
from app.simulation.orbit_engine import SpaceObject

class RiskAssessment(BaseModel):
    satellite_id: str
    debris_id: str
    debris_name: str
    tca: float
    min_distance: float
    relative_velocity: float
    probability_of_collision: float  # Simplified 2D Pc value
    risk_score: float                # 0.0 to 100.0 prototype score
    risk_level: str                  # LOW, MEDIUM, HIGH, CRITICAL
    combined_radius: float           # meters
    position_uncertainty_std: float  # meters (1-sigma)
    risk_factors: List[str]          # Human-readable explanatory factors
    disclaimer: str = "Prototype Collision Risk Model — Educational/Hackathon representation, not flight-certified Pc."

def compute_collision_probability(
    min_distance: float,
    combined_radius: float,
    combined_sigma: float
) -> float:
    """
    Computes simplified 2D isotropic Probability of Collision (Pc) using Chan's approximation formula.
    Pc = (R^2 / (2 * sigma^2)) * exp(-d_min^2 / (2 * sigma^2))
    """
    if combined_sigma <= 0:
        combined_sigma = 50.0  # default 50m 1-sigma uncertainty
        
    v_param = (min_distance ** 2) / (2.0 * (combined_sigma ** 2))
    
    # Avoid numerical underflow for large distances
    if v_param > 500:
        return 0.0
        
    scale = (combined_radius ** 2) / (2.0 * (combined_sigma ** 2))
    pc = scale * math.exp(-v_param)
    return float(min(1.0, max(0.0, pc)))

def calculate_risk_assessment(
    conjunction: ConjunctionResult,
    sat: SpaceObject,
    debris: SpaceObject
) -> RiskAssessment:
    """
    Evaluates collision risk for a conjunction event.
    Returns Pc, prototype 0-100 risk score, risk level, and explanatory factors.
    """
    min_dist = conjunction.min_distance
    rel_vel = conjunction.relative_velocity
    tca = conjunction.tca
    
    combined_radius = sat.radius + debris.radius
    combined_sigma = math.sqrt(sat.position_uncertainty_std**2 + debris.position_uncertainty_std**2)
    
    # 1. Compute 2D Pc
    pc = compute_collision_probability(min_dist, combined_radius, combined_sigma)
    
    # 2. Compute Prototype Risk Score (0 - 100)
    # Exponential decay based on distance threshold (5000m reference)
    dist_factor = math.exp(-min_dist / 1200.0) # High when < 1200m
    if min_dist < 500.0:
        # Boost score significantly inside 500m danger sphere
        dist_score = 70.0 + 30.0 * (1.0 - min_dist / 500.0)
    else:
        dist_score = 70.0 * dist_factor
        
    # Velocity contribution (higher relative velocity increases energy & threat)
    vel_score = min(15.0, (rel_vel / 1000.0) * 1.5)
    
    # Time urgency factor (TCA within 2 hours = 7200s gets urgency multiplier)
    time_urgency = 1.0
    if tca < 7200.0:
        time_urgency = 1.0 + 0.2 * (1.0 - tca / 7200.0)
        
    raw_score = (dist_score + vel_score) * time_urgency
    risk_score = float(min(100.0, max(0.0, raw_score)))
    
    # 3. Risk Level Classification
    if min_dist <= 500.0 or pc > 1e-3 or risk_score >= 70.0:
        risk_level = "CRITICAL"
    elif min_dist <= 1500.0 or pc > 1e-5 or risk_score >= 40.0:
        risk_level = "HIGH"
    elif min_dist <= 5000.0 or pc > 1e-7 or risk_score >= 15.0:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"
        
    # 4. Human-readable Risk Factors
    factors = []
    if min_dist <= 500.0:
        factors.append(f"CRITICAL CLOSE APPROACH: Miss distance ({min_dist:.1f} m) is within emergency 500m safety sphere.")
    elif min_dist <= 1500.0:
        factors.append(f"HIGH PROXIMITY: Miss distance ({min_dist:.1f} m) breaches high-risk threshold (1.5 km).")
    elif min_dist <= 5000.0:
        factors.append(f"MODERATE PROXIMITY: Miss distance ({min_dist:.1f} m) within 5 km alert boundary.")
    else:
        factors.append(f"SAFE MARGIN: Miss distance ({min_dist/1000.0:.2f} km) is well outside warning zone.")
        
    if rel_vel > 10000.0:
        factors.append(f"HYPERVELOCITY IMPACT RISK: Extremely high relative velocity ({rel_vel/1000.0:.2f} km/s).")
    elif rel_vel > 3000.0:
        factors.append(f"HIGH RELATIVE SPEED: Conjunction speed ({rel_vel/1000.0:.2f} km/s).")
        
    if tca <= 3600.0:
        factors.append(f"URGENT TIME WINDOW: Time of Closest Approach is within {tca/60.0:.1f} minutes.")
    elif tca <= 14400.0:
        factors.append(f"SHORT NOTICE: TCA occurs in {tca/3600.0:.1f} hours.")
        
    factors.append(f"POSITIONAL UNCERTAINTY: Combined 1-sigma uncertainty ellipsoid = {combined_sigma:.1f} m.")
    factors.append(f"COMBINED HARD-BODY RADIUS: Satellite ({sat.radius}m) + Debris ({debris.radius}m) = {combined_radius:.1f} m.")

    return RiskAssessment(
        satellite_id=sat.id,
        debris_id=debris.id,
        debris_name=debris.name,
        tca=tca,
        min_distance=min_dist,
        relative_velocity=rel_vel,
        probability_of_collision=pc,
        risk_score=risk_score,
        risk_level=risk_level,
        combined_radius=combined_radius,
        position_uncertainty_std=combined_sigma,
        risk_factors=factors
    )
