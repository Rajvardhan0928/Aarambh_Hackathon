import math
import numpy as np
from typing import Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field

# Physical and Astrodynamical Constants (WGS84 / EGM96 standard values)
MU_EARTH = 3.986004418e14  # Earth gravitational parameter (m^3 / s^2)
EARTH_RADIUS = 6378137.0    # Mean equatorial radius of Earth (m)
J2_EARTH = 1.08263e-3       # Earth J2 oblateness coefficient

class OrbitalElements(BaseModel):
    semi_major_axis: float  # a in meters
    eccentricity: float     # e (dimensionless, 0 <= e < 1)
    inclination: float      # i in radians
    raan: float             # Right Ascension of Ascending Node (Omega) in radians
    arg_of_perigee: float   # Argument of Perigee (omega) in radians
    mean_anomaly: float     # Mean Anomaly (M_0) in radians at epoch_offset=0
    epoch_offset: float = 0.0 # Epoch offset in seconds from simulation start

class StateVector(BaseModel):
    position: Tuple[float, float, float]  # ECI (x, y, z) in meters
    velocity: Tuple[float, float, float]  # ECI (vx, vy, vz) in m/s
    time_offset: float                    # Time in seconds from simulation start

class SpaceObject(BaseModel):
    id: str
    name: str
    object_type: str = "DEBRIS" # "SATELLITE" or "DEBRIS"
    mass: float = 500.0         # kg
    radius: float = 1.5         # effective radius in meters
    elements: Optional[OrbitalElements] = None
    tle_line1: Optional[str] = None
    tle_line2: Optional[str] = None
    position_uncertainty_std: float = 50.0 # meters (1-sigma position standard deviation)

def solve_kepler(M: float, e: float, tol: float = 1e-11, max_iter: int = 100) -> float:
    """
    Solves Kepler's Equation for Eccentric Anomaly E: M = E - e*sin(E).
    Uses Newton-Raphson iteration with robust bounds.
    """
    # Normalize M to [0, 2*pi)
    M = M % (2.0 * math.pi)
    
    # Initial guess
    if e < 0.8:
        E = M
    else:
        E = math.pi
        
    for _ in range(max_iter):
        f = E - e * math.sin(E) - M
        f_prime = 1.0 - e * math.cos(E)
        delta = f / f_prime
        E = E - delta
        if abs(delta) < tol:
            break
            
    return E

def keplerian_to_eci(elements: OrbitalElements, time_offset: float = 0.0, mu: float = MU_EARTH) -> Tuple[np.ndarray, np.ndarray]:
    """
    Converts Keplerian orbital elements to ECI Cartesian position (m) and velocity (m/s) vectors
    at a specified time offset (seconds) from epoch.
    Includes mean motion propagation.
    """
    a = elements.semi_major_axis
    e = elements.eccentricity
    inc = elements.inclination
    raan = elements.raan
    argp = elements.arg_of_perigee
    
    # Calculate mean motion n (rad/s)
    n = math.sqrt(mu / (a ** 3))
    
    # Propagate mean anomaly to target time
    dt = time_offset - elements.epoch_offset
    M = (elements.mean_anomaly + n * dt) % (2.0 * math.pi)
    
    # Solve for Eccentric Anomaly E
    E = solve_kepler(M, e)
    
    # True Anomaly nu
    sin_nu = (math.sqrt(1.0 - e**2) * math.sin(E)) / (1.0 - e * math.cos(E))
    cos_nu = (math.cos(E) - e) / (1.0 - e * math.cos(E))
    nu = math.atan2(sin_nu, cos_nu)
    
    # Radius distance r
    r = a * (1.0 - e * math.cos(E))
    
    # Position and velocity in orbital frame (perifocal plane)
    r_pqw = np.array([r * math.cos(nu), r * math.sin(nu), 0.0])
    
    p = a * (1.0 - e**2)
    h = math.sqrt(mu * p)
    v_pqw = np.array([
        -math.sqrt(mu / p) * math.sin(nu),
        math.sqrt(mu / p) * (e + math.cos(nu)),
        0.0
    ])
    
    # Rotation matrix from Perifocal (PQW) to ECI
    # R = R_z(-raan) * R_x(-inc) * R_z(-argp)
    cos_o, sin_o = math.cos(raan), math.sin(raan)
    cos_i, sin_i = math.cos(inc), math.sin(inc)
    cos_w, sin_w = math.cos(argp), math.sin(argp)
    
    R = np.array([
        [cos_o*cos_w - sin_o*sin_w*cos_i, -cos_o*sin_w - sin_o*cos_w*cos_i,  sin_o*sin_i],
        [sin_o*cos_w + cos_o*sin_w*cos_i, -sin_o*sin_w + cos_o*cos_w*cos_i, -cos_o*sin_i],
        [sin_w*sin_i,                      cos_w*sin_i,                      cos_i]
    ])
    
    r_eci = R @ r_pqw
    v_eci = R @ v_pqw
    
    return r_eci, v_eci

def eci_to_keplerian(r_eci: np.ndarray, v_eci: np.ndarray, mu: float = MU_EARTH) -> OrbitalElements:
    """
    Converts ECI position (m) and velocity (m/s) vectors to Keplerian orbital elements.
    """
    r_norm = np.linalg.norm(r_eci)
    v_norm = np.linalg.norm(v_eci)
    
    # Angular momentum vector h
    h = np.cross(r_eci, v_eci)
    h_norm = np.linalg.norm(h)
    
    # Node vector n_vec = k x h
    k_unit = np.array([0.0, 0.0, 1.0])
    n_vec = np.cross(k_unit, h)
    n_norm = np.linalg.norm(n_vec)
    
    # Eccentricity vector e_vec
    e_vec = (1.0 / mu) * ((v_norm**2 - mu / r_norm) * r_eci - np.dot(r_eci, v_eci) * v_eci)
    e = float(np.linalg.norm(e_vec))
    
    # Specific mechanical energy xi
    xi = (v_norm**2) / 2.0 - mu / r_norm
    if abs(e - 1.0) > 1e-7:
        a = -mu / (2.0 * xi)
    else:
        a = r_norm
        
    # Inclination i
    inc = math.acos(np.clip(h[2] / h_norm, -1.0, 1.0))
    
    # RAAN (Omega)
    if n_norm != 0:
        raan = math.acos(np.clip(n_vec[0] / n_norm, -1.0, 1.0))
        if n_vec[1] < 0:
            raan = 2.0 * math.pi - raan
    else:
        raan = 0.0
        
    # Argument of Perigee (omega)
    if n_norm != 0 and e > 1e-7:
        argp = math.acos(np.clip(np.dot(n_vec, e_vec) / (n_norm * e), -1.0, 1.0))
        if e_vec[2] < 0:
            argp = 2.0 * math.pi - argp
    else:
        argp = 0.0
        
    # True Anomaly (nu)
    if e > 1e-7:
        nu = math.acos(np.clip(np.dot(e_vec, r_eci) / (e * r_norm), -1.0, 1.0))
        if np.dot(r_eci, v_eci) < 0:
            nu = 2.0 * math.pi - nu
    else:
        nu = 0.0
        
    # Eccentric Anomaly E
    sin_E = (math.sqrt(1.0 - e**2) * math.sin(nu)) / (1.0 + e * math.cos(nu))
    cos_E = (e + math.cos(nu)) / (1.0 + e * math.cos(nu))
    E = math.atan2(sin_E, cos_E)
    
    # Mean Anomaly M
    M = (E - e * math.sin(E)) % (2.0 * math.pi)
    
    return OrbitalElements(
        semi_major_axis=a,
        eccentricity=e,
        inclination=inc,
        raan=raan,
        arg_of_perigee=argp,
        mean_anomaly=M,
        epoch_offset=0.0
    )
