import math
import numpy as np
from typing import List, Dict, Tuple
from app.simulation.orbit_engine import SpaceObject, OrbitalElements, EARTH_RADIUS

def get_target_satellite() -> SpaceObject:
    """
    Returns primary target satellite in ~550 km Low Earth Orbit (ISS inclination 51.6 deg).
    """
    a_sat = EARTH_RADIUS + 550000.0  # 550 km altitude
    return SpaceObject(
        id="SAT_01",
        name="Aarambh-Sat-1 (Target)",
        object_type="SATELLITE",
        mass=750.0,   # kg
        radius=2.0,   # meters
        elements=OrbitalElements(
            semi_major_axis=a_sat,
            eccentricity=0.0008,
            inclination=math.radians(51.6),
            raan=math.radians(45.0),
            arg_of_perigee=math.radians(30.0),
            mean_anomaly=math.radians(10.0),
            epoch_offset=0.0
        ),
        position_uncertainty_std=30.0 # 30m 1-sigma uncertainty
    )

def generate_scenario_debris(scenario_id: int) -> Tuple[SpaceObject, List[SpaceObject]]:
    """
    Returns (target_satellite, list_of_debris) for preset scenarios 1 to 4.
    """
    sat = get_target_satellite()
    a_sat = sat.elements.semi_major_axis
    inc_sat = sat.elements.inclination
    raan_sat = sat.elements.raan
    argp_sat = sat.elements.arg_of_perigee
    M_sat = sat.elements.mean_anomaly
    
    debris_list = []
    
    if scenario_id == 1:
        # SCENARIO 1: Normal Traffic (All debris safe > 10 km)
        for idx in range(1, 6):
            d_obj = SpaceObject(
                id=f"DEBRIS_10{idx}",
                name=f"Cosmos-2251 Fragment #{idx}",
                object_type="DEBRIS",
                mass=45.0 + idx * 10,
                radius=0.8,
                elements=OrbitalElements(
                    semi_major_axis=a_sat + 15000.0 + idx * 3000.0,
                    eccentricity=0.002,
                    inclination=inc_sat + math.radians(0.5 * idx),
                    raan=raan_sat + math.radians(2.0 * idx),
                    arg_of_perigee=argp_sat + math.radians(5.0),
                    mean_anomaly=M_sat + math.radians(5.0 * idx),
                    epoch_offset=0.0
                ),
                position_uncertainty_std=50.0
            )
            debris_list.append(d_obj)
            
    elif scenario_id == 2:
        # SCENARIO 2: Medium-risk conjunction (~2.5 km miss distance)
        d_med = SpaceObject(
            id="DEBRIS_201",
            name="FENGYUN 1C Debris #201",
            object_type="DEBRIS",
            mass=85.0,
            radius=1.2,
            elements=OrbitalElements(
                semi_major_axis=a_sat + 2600.0,
                eccentricity=0.001,
                inclination=inc_sat + math.radians(0.08),
                raan=raan_sat + math.radians(0.12),
                arg_of_perigee=argp_sat + math.radians(0.1),
                mean_anomaly=M_sat + math.radians(0.05),
                epoch_offset=0.0
            ),
            position_uncertainty_std=45.0
        )
        debris_list.append(d_med)
        # Background safe debris
        for idx in range(2, 6):
            d_safe = SpaceObject(
                id=f"DEBRIS_20{idx}",
                name=f"SL-16 R/B Fragment #{idx}",
                object_type="DEBRIS",
                mass=120.0,
                radius=1.5,
                elements=OrbitalElements(
                    semi_major_axis=a_sat - 18000.0 - idx * 4000.0,
                    eccentricity=0.003,
                    inclination=inc_sat + math.radians(1.5 * idx),
                    raan=raan_sat + math.radians(3.0),
                    arg_of_perigee=argp_sat,
                    mean_anomaly=M_sat + math.radians(8.0 * idx),
                    epoch_offset=0.0
                ),
                position_uncertainty_std=60.0
            )
            debris_list.append(d_safe)
            
    elif scenario_id == 3:
        # SCENARIO 3: Critical Conjunction (~200 m miss distance)
        d_crit = SpaceObject(
            id="DEBRIS_301",
            name="CZ-4C Fragment #301 (CRITICAL)",
            object_type="DEBRIS",
            mass=180.0,
            radius=1.8,
            elements=OrbitalElements(
                semi_major_axis=a_sat + 180.0,
                eccentricity=0.0008,
                inclination=inc_sat + math.radians(0.005),
                raan=raan_sat + math.radians(0.008),
                arg_of_perigee=argp_sat + math.radians(0.002),
                mean_anomaly=M_sat + math.radians(0.003),
                epoch_offset=0.0
            ),
            position_uncertainty_std=50.0
        )
        debris_list.append(d_crit)
        
    elif scenario_id == 4:
        # SCENARIO 4: MASTER HACKATHON DEMO (10 Debris objects: 1 Critical, 1 Medium, 8 Background)
        # 1. Critical Object (~180m miss distance)
        d_crit = SpaceObject(
            id="DEBRIS_401",
            name="Cosmos-1408 Fragment #401 (CRITICAL THREAT)",
            object_type="DEBRIS",
            mass=210.0,
            radius=2.2,
            elements=OrbitalElements(
                semi_major_axis=a_sat + 190.0,
                eccentricity=0.0008,
                inclination=inc_sat + math.radians(0.004),
                raan=raan_sat + math.radians(0.006),
                arg_of_perigee=argp_sat + math.radians(0.001),
                mean_anomaly=M_sat + math.radians(0.002),
                epoch_offset=0.0
            ),
            position_uncertainty_std=50.0
        )
        debris_list.append(d_crit)
        
        # 2. Medium Risk Object (~3.2 km miss distance)
        d_med = SpaceObject(
            id="DEBRIS_402",
            name="SL-8 Rocket Body Fragment",
            object_type="DEBRIS",
            mass=350.0,
            radius=2.5,
            elements=OrbitalElements(
                semi_major_axis=a_sat - 3200.0,
                eccentricity=0.0012,
                inclination=inc_sat + math.radians(0.06),
                raan=raan_sat - math.radians(0.08),
                arg_of_perigee=argp_sat + math.radians(0.04),
                mean_anomaly=M_sat + math.radians(0.03),
                epoch_offset=0.0
            ),
            position_uncertainty_std=55.0
        )
        debris_list.append(d_med)
        
        # 3 to 10. Background Safe Debris Objects
        safe_names = [
            "Iridium-33 Fragment #12",
            "Pegasus HAPS Debris",
            "Delta 1 Debris #88",
            "Titan 3C Fragment",
            "Ariane 42P Upper Stage Fragment",
            "CZ-2D Debris #104",
            "H-2A Rocket Fragment",
            "Vanguard 1 Object C"
        ]
        for idx, name in enumerate(safe_names, start=3):
            d_safe = SpaceObject(
                id=f"DEBRIS_4{idx:02d}",
                name=name,
                object_type="DEBRIS",
                mass=30.0 + idx * 15,
                radius=0.5 + (idx % 3) * 0.4,
                elements=OrbitalElements(
                    semi_major_axis=a_sat + (12000.0 if idx%2==0 else -14000.0) + idx * 2500.0,
                    eccentricity=0.001 + idx * 0.0003,
                    inclination=inc_sat + math.radians(0.8 * idx * (-1 if idx%2==0 else 1)),
                    raan=raan_sat + math.radians(1.5 * idx),
                    arg_of_perigee=argp_sat + math.radians(3.0 * idx),
                    mean_anomaly=M_sat + math.radians(4.0 * idx),
                    epoch_offset=0.0
                ),
                position_uncertainty_std=40.0 + idx * 5
            )
            debris_list.append(d_safe)
            
    return sat, debris_list
