import math
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from pydantic import BaseModel

from app.simulation.orbit_engine import SpaceObject, OrbitalElements, eci_to_keplerian
from app.simulation.propagator import propagate_object_state
from app.simulation.conjunction import ConjunctionResult, analyze_conjunction
from app.risk.risk_analyzer import RiskAssessment, calculate_risk_assessment

G0 = 9.80665  # Standard gravity m/s^2

class ManeuverCandidate(BaseModel):
    id: str
    direction_name: str                  # e.g., "+Transverse (+In-Track)"
    rtn_vector: Tuple[float, float, float]# (delta_v_R, delta_v_T, delta_v_N) in m/s
    eci_delta_v: Tuple[float, float, float]# (dv_x, dv_y, dv_z) in m/s
    delta_v_magnitude: float             # m/s
    maneuver_time_offset: float          # seconds from epoch
    energy_cost_joules: float            # 0.5 * m * dv^2 (J)
    fuel_mass_kg: float                  # Propellant mass via Tsiolkovsky equation
    post_burn_tca: float
    post_burn_min_distance: float       # meters
    post_burn_relative_velocity: float  # m/s
    post_burn_risk_score: float         # 0 - 100
    post_burn_risk_level: float = 0.0   # numeric auxiliary
    post_burn_risk_level_str: str        # LOW, MEDIUM, HIGH, CRITICAL
    is_safe: bool                        # min_distance >= safety_threshold and LOW/MEDIUM risk

def compute_rtn_frame(r_eci: np.ndarray, v_eci: np.ndarray) -> np.ndarray:
    """
    Computes local RTN (Radial, Transverse/In-track, Normal/Cross-track) rotation matrix.
    R_unit = r / ||r||
    N_unit = (r x v) / ||r x v||
    T_unit = N_unit x R_unit
    Returns 3x3 transformation matrix M = [R_unit, T_unit, N_unit] where v_eci = M @ v_rtn
    """
    r_norm = np.linalg.norm(r_eci)
    v_norm = np.linalg.norm(v_eci)
    
    R_unit = r_eci / r_norm
    h = np.cross(r_eci, v_eci)
    h_norm = np.linalg.norm(h)
    N_unit = h / h_norm
    T_unit = np.cross(N_unit, R_unit)
    
    # Rotation matrix from RTN to ECI
    M_rtn_to_eci = np.column_stack((R_unit, T_unit, N_unit))
    return M_rtn_to_eci

def create_modified_satellite(sat: SpaceObject, maneuver_time: float, delta_v_eci: np.ndarray) -> SpaceObject:
    """
    Creates a new SpaceObject representing the satellite post-maneuver.
    Applies delta_v_eci at maneuver_time and updates orbital elements.
    """
    r_orig, v_orig = propagate_object_state(sat, maneuver_time)
    v_new = v_orig + delta_v_eci
    
    new_elements = eci_to_keplerian(r_orig, v_new)
    new_elements.epoch_offset = maneuver_time
    
    sat_copy = sat.model_copy()
    sat_copy.id = f"{sat.id}_maneuvered"
    sat_copy.name = f"{sat.name} (Post-Burn)"
    sat_copy.elements = new_elements
    sat_copy.tle_line1 = None
    sat_copy.tle_line2 = None # Use orbital elements post burn
    return sat_copy

def generate_candidate_maneuvers(
    sat: SpaceObject,
    debris: SpaceObject,
    initial_conjunction: ConjunctionResult,
    maneuver_lead_time: float = 1800.0, # Execute burn 30 mins before TCA by default
    isp_sec: float = 300.0,             # Thruster specific impulse (s)
    safety_distance_threshold: float = 5000.0 # 5 km safety margin
) -> List[ManeuverCandidate]:
    """
    Generates a suite of candidate RTN ΔV orbital maneuvers.
    Evaluates post-burn conjunction parameters and safety metrics for each candidate.
    """
    tca = initial_conjunction.tca
    maneuver_time = max(0.0, tca - maneuver_lead_time)
    
    # State of satellite at maneuver execution time
    r_sat, v_sat = propagate_object_state(sat, maneuver_time)
    M_rtn_to_eci = compute_rtn_frame(r_sat, v_sat)
    
    # RTN directional vectors unit definitions
    directions = [
        ("+Transverse (+In-Track)", np.array([0.0, 1.0, 0.0])),
        ("-Transverse (-In-Track)", np.array([0.0, -1.0, 0.0])),
        ("+Radial (Outward)",       np.array([1.0, 0.0, 0.0])),
        ("-Radial (Inward)",        np.array([-1.0, 0.0, 0.0])),
        ("+Normal (+Cross-Track)",  np.array([0.0, 0.0, 1.0])),
        ("-Normal (-Cross-Track)",  np.array([0.0, 0.0, -1.0])),
        ("+Transverse / +Normal",   np.array([0.0, 1/math.sqrt(2), 1/math.sqrt(2)])),
        ("-Transverse / +Normal",   np.array([0.0, -1/math.sqrt(2), 1/math.sqrt(2)])),
    ]
    
    magnitudes = [0.05, 0.1, 0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0] # ΔV in m/s
    
    candidates = []
    cand_index = 1
    
    for dir_name, u_rtn in directions:
        for dv_mag in magnitudes:
            v_rtn = u_rtn * dv_mag
            v_eci = M_rtn_to_eci @ v_rtn
            
            # Create post-burn satellite & re-analyze conjunction
            sat_post = create_modified_satellite(sat, maneuver_time, v_eci)
            
            # Analyze conjunction around original TCA window
            post_conj = analyze_conjunction(
                sat_post, debris,
                start_time=max(0.0, tca - 3600.0),
                end_time=tca + 3600.0,
                coarse_step=15.0
            )
            
            post_risk = calculate_risk_assessment(post_conj, sat_post, debris)
            
            # Energy & Mass Consumption
            m_sat = sat.mass
            energy_j = 0.5 * m_sat * (dv_mag ** 2)
            fuel_kg = m_sat * (1.0 - math.exp(-dv_mag / (G0 * isp_sec)))
            
            is_safe = (post_conj.min_distance >= safety_distance_threshold) and (post_risk.risk_level in ["LOW", "MEDIUM"])
            
            candidate = ManeuverCandidate(
                id=f"MANEUVER_{cand_index:03d}",
                direction_name=dir_name,
                rtn_vector=(float(v_rtn[0]), float(v_rtn[1]), float(v_rtn[2])),
                eci_delta_v=(float(v_eci[0]), float(v_eci[1]), float(v_eci[2])),
                delta_v_magnitude=dv_mag,
                maneuver_time_offset=maneuver_time,
                energy_cost_joules=energy_j,
                fuel_mass_kg=fuel_kg,
                post_burn_tca=post_conj.tca,
                post_burn_min_distance=post_conj.min_distance,
                post_burn_relative_velocity=post_conj.relative_velocity,
                post_burn_risk_score=post_risk.risk_score,
                post_burn_risk_level_str=post_risk.risk_level,
                is_safe=is_safe
            )
            candidates.append(candidate)
            cand_index += 1
            
    return candidates
