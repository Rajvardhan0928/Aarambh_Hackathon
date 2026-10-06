import math
import numpy as np
import pytest
from app.simulation.orbit_engine import SpaceObject, OrbitalElements, EARTH_RADIUS
from app.simulation.conjunction import analyze_conjunction

def test_deterministic_conjunction():
    a = EARTH_RADIUS + 500000.0
    sat = SpaceObject(
        id="TEST_SAT",
        name="Test Satellite",
        elements=OrbitalElements(
            semi_major_axis=a,
            eccentricity=0.0001,
            inclination=math.radians(50.0),
            raan=math.radians(0.0),
            arg_of_perigee=math.radians(0.0),
            mean_anomaly=math.radians(0.0),
            epoch_offset=0.0
        )
    )
    
    # Debris placed with slight semi-major axis offset (300m)
    debris = SpaceObject(
        id="TEST_DEBRIS",
        name="Test Debris",
        elements=OrbitalElements(
            semi_major_axis=a + 300.0,
            eccentricity=0.0001,
            inclination=math.radians(50.0),
            raan=math.radians(0.0),
            arg_of_perigee=math.radians(0.0),
            mean_anomaly=math.radians(0.0),
            epoch_offset=0.0
        )
    )
    
    conj = analyze_conjunction(sat, debris, start_time=0.0, end_time=600.0)
    
    # Minimum separation should be close to 300m
    assert conj.min_distance > 0.0
    assert abs(conj.min_distance - 300.0) < 50.0
    assert conj.tca >= 0.0
