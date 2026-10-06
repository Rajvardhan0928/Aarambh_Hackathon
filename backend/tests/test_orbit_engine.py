import math
import numpy as np
import pytest
from app.simulation.orbit_engine import (
    OrbitalElements, keplerian_to_eci, eci_to_keplerian, EARTH_RADIUS
)
from app.simulation.propagator import propagate_kepler_j2

def test_keplerian_eci_roundtrip():
    a = EARTH_RADIUS + 500000.0  # 500 km altitude
    elements_orig = OrbitalElements(
        semi_major_axis=a,
        eccentricity=0.001,
        inclination=math.radians(45.0),
        raan=math.radians(30.0),
        arg_of_perigee=math.radians(60.0),
        mean_anomaly=math.radians(15.0),
        epoch_offset=0.0
    )
    
    r_eci, v_eci = keplerian_to_eci(elements_orig, time_offset=0.0)
    elements_calc = eci_to_keplerian(r_eci, v_eci)
    
    assert math.isclose(elements_calc.semi_major_axis, elements_orig.semi_major_axis, rel_tol=1e-5)
    assert math.isclose(elements_calc.eccentricity, elements_orig.eccentricity, abs_tol=1e-4)
    assert math.isclose(elements_calc.inclination, elements_orig.inclination, abs_tol=1e-5)
    assert math.isclose(elements_calc.raan, elements_orig.raan, abs_tol=1e-4)

def test_j2_propagation():
    a = EARTH_RADIUS + 600000.0
    elements = OrbitalElements(
        semi_major_axis=a,
        eccentricity=0.001,
        inclination=math.radians(51.6),
        raan=math.radians(10.0),
        arg_of_perigee=math.radians(20.0),
        mean_anomaly=math.radians(0.0),
        epoch_offset=0.0
    )
    
    r1, v1 = propagate_kepler_j2(elements, t_offset=0.0)
    r2, v2 = propagate_kepler_j2(elements, t_offset=3600.0) # 1 hour propagation
    
    # Distance from Earth center should remain close to ~6978 km
    assert math.isclose(np.linalg.norm(r1), a, rel_tol=1e-2)
    assert math.isclose(np.linalg.norm(r2), a, rel_tol=1e-2)
