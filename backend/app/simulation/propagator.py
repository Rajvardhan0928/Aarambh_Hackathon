import math
import numpy as np
from typing import List, Tuple, Optional
from sgp4.api import Satrec, jday
from datetime import datetime, timezone, timedelta

from app.simulation.orbit_engine import (
    SpaceObject, OrbitalElements, StateVector,
    keplerian_to_eci, MU_EARTH, EARTH_RADIUS, J2_EARTH, solve_kepler
)

def propagate_kepler_j2(elements: OrbitalElements, t_offset: float, mu: float = MU_EARTH) -> Tuple[np.ndarray, np.ndarray]:
    """
    Propagates Keplerian elements considering J2 spherical harmonic perturbation (secular rates).
    Calculates RAAN regression, Argument of Perigee advance, and perturbed Mean Motion.
    """
    a = elements.semi_major_axis
    e = elements.eccentricity
    inc = elements.inclination
    
    p = a * (1.0 - e**2)
    n0 = math.sqrt(mu / (a**3))
    
    # J2 secular perturbation rates (rad/s)
    j2_factor = 1.5 * J2_EARTH * (EARTH_RADIUS / p)**2
    
    # Perturbed mean motion n_bar
    n_bar = n0 * (1.0 + j2_factor * math.sqrt(1.0 - e**2) * (1.0 - 1.5 * (math.sin(inc)**2)))
    
    # Nodal precession rate (RAAN dot)
    raan_dot = -j2_factor * n_bar * math.cos(inc)
    
    # Apsidal precession rate (argp dot)
    argp_dot = j2_factor * n_bar * (2.0 - 2.5 * (math.sin(inc)**2))
    
    dt = t_offset - elements.epoch_offset
    
    # Perturbed elements at target time
    raan_t = (elements.raan + raan_dot * dt) % (2.0 * math.pi)
    argp_t = (elements.arg_of_perigee + argp_dot * dt) % (2.0 * math.pi)
    M_t = (elements.mean_anomaly + n_bar * dt) % (2.0 * math.pi)
    
    elements_t = OrbitalElements(
        semi_major_axis=a,
        eccentricity=e,
        inclination=inc,
        raan=raan_t,
        arg_of_perigee=argp_t,
        mean_anomaly=M_t,
        epoch_offset=t_offset
    )
    
    return keplerian_to_eci(elements_t, time_offset=t_offset, mu=mu)

def propagate_sgp4(line1: str, line2: str, t_offset: float, epoch_base: Optional[datetime] = None) -> Tuple[np.ndarray, np.ndarray]:
    """
    Propagates object using SGP4 library given Two-Line Element (TLE) set.
    """
    sat = Satrec.twoline2rv(line1, line2)
    
    if epoch_base is None:
        # Use current UTC epoch base
        epoch_base = datetime.now(timezone.utc)
        
    target_dt = epoch_base + timedelta(seconds=t_offset)
    jd, fr = jday(target_dt.year, target_dt.month, target_dt.day, target_dt.hour, target_dt.minute, target_dt.second + target_dt.microsecond * 1e-6)
    
    e, r, v = sat.sgp4(jd, fr)
    if e != 0:
        raise ValueError(f"SGP4 propagation error code: {e}")
        
    # SGP4 returns r in km, v in km/s. Convert to meters and m/s
    r_m = np.array(r) * 1000.0
    v_m = np.array(v) * 1000.0
    
    return r_m, v_m

def propagate_object_state(obj: SpaceObject, t_offset: float, epoch_base: Optional[datetime] = None) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes ECI position (m) and velocity (m/s) for a SpaceObject at t_offset seconds.
    Supports TLE SGP4 propagation or Keplerian + J2 propagation.
    """
    if obj.tle_line1 and obj.tle_line2:
        try:
            return propagate_sgp4(obj.tle_line1, obj.tle_line2, t_offset, epoch_base)
        except Exception:
            pass # Fallback to elements if TLE fails
            
    if obj.elements:
        return propagate_kepler_j2(obj.elements, t_offset)
        
    raise ValueError(f"SpaceObject '{obj.name}' has neither valid TLE nor OrbitalElements.")

def propagate_trajectory(obj: SpaceObject, start_time: float, end_time: float, step_sec: float) -> List[StateVector]:
    """
    Generates a dense time series trajectory of StateVectors over [start_time, end_time].
    """
    trajectory = []
    t = start_time
    while t <= end_time:
        r, v = propagate_object_state(obj, t)
        trajectory.append(StateVector(
            position=(float(r[0]), float(r[1]), float(r[2])),
            velocity=(float(v[0]), float(v[1]), float(v[2])),
            time_offset=float(t)
        ))
        t += step_sec
    return trajectory
