import {
  SpaceObject,
  ConjunctionResult,
  RiskAssessment,
  ConjunctionSummaryItem,
  GraphPoint,
  OptimizationResult,
  ManeuverCandidate,
  Scenario
} from '../types';

export const DEMO_SCENARIOS: Scenario[] = [
  {
    id: 1,
    name: "Scenario 1: Normal Space Traffic",
    description: "Clear orbital environment. All space debris objects maintain safe miss distances (> 10 km).",
    risk_level: "LOW"
  },
  {
    id: 2,
    name: "Scenario 2: Medium-Risk Conjunction",
    description: "FENGYUN 1C fragment approaching within ~2.6 km. Triggers medium alert status.",
    risk_level: "MEDIUM"
  },
  {
    id: 3,
    name: "Scenario 3: Critical Conjunction Threat",
    description: "CZ-4C fragment approaching within ~200 meters. Demands immediate collision avoidance maneuver.",
    risk_level: "CRITICAL"
  },
  {
    id: 4,
    name: "Scenario 4: Multi-Debris Complex Traffic (Master Demo)",
    description: "10 tracked debris fragments surrounding Aarambh-Sat-1, featuring 1 Critical threat (~190m), 1 Medium risk (~3.2km), and 8 safe background objects.",
    risk_level: "CRITICAL"
  }
];

export const DEMO_TARGET_SATELLITE: SpaceObject = {
  id: "SAT_01",
  name: "Aarambh-Sat-1 (Target)",
  object_type: "SATELLITE",
  mass: 750.0,
  radius: 2.0,
  position_uncertainty_std: 30.0,
  elements: {
    semi_major_axis: 6928137.0, // 550 km altitude
    eccentricity: 0.0008,
    inclination: 0.90058, // 51.6 degrees
    raan: 0.7854,
    arg_of_perigee: 0.5236,
    mean_anomaly: 0.1745,
    epoch_offset: 0.0
  }
};

export const DEMO_DEBRIS_LIST: SpaceObject[] = [
  {
    id: "DEBRIS_01",
    name: "Cosmos-1408 Fragment #401 (CRITICAL THREAT)",
    object_type: "DEBRIS",
    mass: 210.0,
    radius: 2.2,
    position_uncertainty_std: 50.0
  },
  {
    id: "DEBRIS_02",
    name: "SL-8 Rocket Body Fragment",
    object_type: "DEBRIS",
    mass: 350.0,
    radius: 2.5,
    position_uncertainty_std: 55.0
  },
  {
    id: "DEBRIS_03",
    name: "Iridium-33 Fragment #12",
    object_type: "DEBRIS",
    mass: 45.0,
    radius: 0.8,
    position_uncertainty_std: 40.0
  },
  {
    id: "DEBRIS_04",
    name: "Pegasus HAPS Debris",
    object_type: "DEBRIS",
    mass: 60.0,
    radius: 1.1,
    position_uncertainty_std: 45.0
  },
  {
    id: "DEBRIS_05",
    name: "Delta 1 Debris #88",
    object_type: "DEBRIS",
    mass: 75.0,
    radius: 1.3,
    position_uncertainty_std: 50.0
  },
  {
    id: "DEBRIS_06",
    name: "Titan 3C Fragment",
    object_type: "DEBRIS",
    mass: 90.0,
    radius: 0.9,
    position_uncertainty_std: 42.0
  },
  {
    id: "DEBRIS_07",
    name: "Ariane 42P Upper Stage Fragment",
    object_type: "DEBRIS",
    mass: 110.0,
    radius: 1.7,
    position_uncertainty_std: 48.0
  },
  {
    id: "DEBRIS_08",
    name: "CZ-2D Debris #104",
    object_type: "DEBRIS",
    mass: 130.0,
    radius: 1.4,
    position_uncertainty_std: 52.0
  },
  {
    id: "DEBRIS_09",
    name: "H-2A Rocket Fragment",
    object_type: "DEBRIS",
    mass: 150.0,
    radius: 1.8,
    position_uncertainty_std: 58.0
  },
  {
    id: "DEBRIS_10",
    name: "Vanguard 1 Object C",
    object_type: "DEBRIS",
    mass: 25.0,
    radius: 0.5,
    position_uncertainty_std: 35.0
  }
];

export const DEMO_CONJUNCTIONS: ConjunctionSummaryItem[] = [
  {
    conjunction: {
      satellite_id: "SAT_01",
      debris_id: "DEBRIS_01",
      debris_name: "Cosmos-1408 Fragment #401 (CRITICAL THREAT)",
      tca: 2967.0,
      min_distance: 189.4,
      relative_velocity: 8343.5,
      relative_position_vec: [-104.8, -203.3, -14.4],
      relative_velocity_vec: [-5593.7, 3274.2, -5253.9],
      sat_position_at_tca: [-1207955.8, -5587261.0, -3923804.8],
      sat_velocity_at_tca: [6177.5, 1551.4, -4108.0],
      debris_position_at_tca: [-1208060.7, -5587464.3, -3923819.3],
      debris_velocity_at_tca: [6177.0, 1551.7, -4108.5]
    },
    risk: {
      satellite_id: "SAT_01",
      debris_id: "DEBRIS_01",
      debris_name: "Cosmos-1408 Fragment #401 (CRITICAL THREAT)",
      tca: 2967.0,
      min_distance: 189.4,
      relative_velocity: 8343.5,
      probability_of_collision: 1.14e-6,
      risk_score: 96.4,
      risk_level: "CRITICAL",
      combined_radius: 4.2,
      position_uncertainty_std: 58.3,
      risk_factors: [
        "CRITICAL CLOSE APPROACH: Miss distance (189.4 m) is inside 500m danger sphere.",
        "URGENT TIME WINDOW: Time of Closest Approach is within 49.5 minutes.",
        "HIGH RELATIVE SPEED: Conjunction speed (8.34 km/s).",
        "POSITIONAL UNCERTAINTY: Combined 1-sigma uncertainty ellipsoid = 58.3 m."
      ],
      disclaimer: "Prototype Collision Risk Model — Educational/Hackathon representation, not flight-certified Pc."
    }
  },
  {
    conjunction: {
      satellite_id: "SAT_01",
      debris_id: "DEBRIS_02",
      debris_name: "SL-8 Rocket Body Fragment",
      tca: 4120.0,
      min_distance: 3180.0,
      relative_velocity: 6120.0,
      relative_position_vec: [1200.0, -2800.0, 450.0],
      relative_velocity_vec: [4100.0, -2200.0, 3900.0],
      sat_position_at_tca: [-1200000.0, -5500000.0, -3900000.0],
      sat_velocity_at_tca: [6100.0, 1500.0, -4100.0],
      debris_position_at_tca: [-1198800.0, -5502800.0, -3899550.0],
      debris_velocity_at_tca: [6110.0, 1505.0, -4105.0]
    },
    risk: {
      satellite_id: "SAT_01",
      debris_id: "DEBRIS_02",
      debris_name: "SL-8 Rocket Body Fragment",
      tca: 4120.0,
      min_distance: 3180.0,
      relative_velocity: 6120.0,
      probability_of_collision: 3.2e-9,
      risk_score: 34.2,
      risk_level: "MEDIUM",
      combined_radius: 4.5,
      position_uncertainty_std: 62.6,
      risk_factors: [
        "MODERATE PROXIMITY: Miss distance (3.18 km) within 5 km alert boundary.",
        "SHORT NOTICE: TCA occurs in 1.1 hours.",
        "POSITIONAL UNCERTAINTY: Combined 1-sigma uncertainty ellipsoid = 62.6 m."
      ],
      disclaimer: "Prototype Collision Risk Model — Educational/Hackathon representation, not flight-certified Pc."
    }
  },
  {
    conjunction: {
      satellite_id: "SAT_01",
      debris_id: "DEBRIS_03",
      debris_name: "Iridium-33 Fragment #12",
      tca: 8400.0,
      min_distance: 14200.0,
      relative_velocity: 7450.0,
      relative_position_vec: [5000.0, 12000.0, -6000.0],
      relative_velocity_vec: [5000.0, 3000.0, -4000.0],
      sat_position_at_tca: [-1500000.0, -5400000.0, -4000000.0],
      sat_velocity_at_tca: [6000.0, 1600.0, -4000.0],
      debris_position_at_tca: [-1495000.0, -5388000.0, -4006000.0],
      debris_velocity_at_tca: [6010.0, 1605.0, -4005.0]
    },
    risk: {
      satellite_id: "SAT_01",
      debris_id: "DEBRIS_03",
      debris_name: "Iridium-33 Fragment #12",
      tca: 8400.0,
      min_distance: 14200.0,
      relative_velocity: 7450.0,
      probability_of_collision: 0.0,
      risk_score: 2.1,
      risk_level: "LOW",
      combined_radius: 2.8,
      position_uncertainty_std: 50.0,
      risk_factors: [
        "SAFE MARGIN: Miss distance (14.20 km) is well outside warning zone."
      ],
      disclaimer: "Prototype Collision Risk Model — Educational/Hackathon representation, not flight-certified Pc."
    }
  },
  {
    conjunction: {
      satellite_id: "SAT_01",
      debris_id: "DEBRIS_04",
      debris_name: "Pegasus HAPS Debris",
      tca: 12500.0,
      min_distance: 18500.0,
      relative_velocity: 5800.0,
      relative_position_vec: [7000.0, -15000.0, 8000.0],
      relative_velocity_vec: [4000.0, -2000.0, 3000.0],
      sat_position_at_tca: [-1700000.0, -5300000.0, -4100000.0],
      sat_velocity_at_tca: [5900.0, 1700.0, -3900.0],
      debris_position_at_tca: [-1693000.0, -5315000.0, -4092000.0],
      debris_velocity_at_tca: [5910.0, 1705.0, -3895.0]
    },
    risk: {
      satellite_id: "SAT_01",
      debris_id: "DEBRIS_04",
      debris_name: "Pegasus HAPS Debris",
      tca: 12500.0,
      min_distance: 18500.0,
      relative_velocity: 5800.0,
      probability_of_collision: 0.0,
      risk_score: 1.4,
      risk_level: "LOW",
      combined_radius: 3.1,
      position_uncertainty_std: 54.0,
      risk_factors: [
        "SAFE MARGIN: Miss distance (18.50 km) is well outside warning zone."
      ],
      disclaimer: "Prototype Collision Risk Model — Educational/Hackathon representation, not flight-certified Pc."
    }
  },
  {
    conjunction: {
      satellite_id: "SAT_01",
      debris_id: "DEBRIS_05",
      debris_name: "Delta 1 Debris #88",
      tca: 15800.0,
      min_distance: 22100.0,
      relative_velocity: 9100.0,
      relative_position_vec: [-10000.0, 18000.0, -9000.0],
      relative_velocity_vec: [6000.0, 4000.0, -5000.0],
      sat_position_at_tca: [-1900000.0, -5200000.0, -4200000.0],
      sat_velocity_at_tca: [5800.0, 1800.0, -3800.0],
      debris_position_at_tca: [-1910000.0, -5182000.0, -4209000.0],
      debris_velocity_at_tca: [5810.0, 1805.0, -3795.0]
    },
    risk: {
      satellite_id: "SAT_01",
      debris_id: "DEBRIS_05",
      debris_name: "Delta 1 Debris #88",
      tca: 15800.0,
      min_distance: 22100.0,
      relative_velocity: 9100.0,
      probability_of_collision: 0.0,
      risk_score: 0.8,
      risk_level: "LOW",
      combined_radius: 3.3,
      position_uncertainty_std: 58.3,
      risk_factors: [
        "SAFE MARGIN: Miss distance (22.10 km) is well outside warning zone."
      ],
      disclaimer: "Prototype Collision Risk Model — Educational/Hackathon representation, not flight-certified Pc."
    }
  }
];

export const DEMO_GRAPH_POINTS: GraphPoint[] = Array.from({ length: 61 }, (_, i) => {
  const mins = i - 30; // -30m to +30m
  const t_offset = 2967 + mins * 60;
  // Parabolic distance curve around TCA 189.4m
  const dist_orig = 189.4 + Math.pow(mins * 0.8, 2) * 18.0;
  // Post-burn distance curve around TCA 6,400m
  const dist_post = 6420.0 + Math.pow(mins * 0.8, 2) * 22.0;

  return {
    time_offset: t_offset,
    time_to_tca_mins: mins,
    distance_m: Math.round(dist_orig * 10) / 10,
    post_maneuver_distance_m: Math.round(dist_post * 10) / 10
  };
});

export const DEMO_CANDIDATE_MANEUVERS: ManeuverCandidate[] = [
  {
    id: "MANEUVER_001",
    direction_name: "+Transverse (+In-Track)",
    rtn_vector: [0.0, 0.5, 0.0],
    eci_delta_v: [-0.34, 0.28, -0.22],
    delta_v_magnitude: 0.5,
    maneuver_time_offset: 1167.0,
    energy_cost_joules: 93.75,
    fuel_mass_kg: 0.127,
    post_burn_tca: 3012.0,
    post_burn_min_distance: 6420.0,
    post_burn_relative_velocity: 8341.2,
    post_burn_risk_score: 4.2,
    post_burn_risk_level_str: "LOW",
    is_safe: true
  },
  {
    id: "MANEUVER_002",
    direction_name: "-Transverse (-In-Track)",
    rtn_vector: [0.0, -0.5, 0.0],
    eci_delta_v: [0.34, -0.28, 0.22],
    delta_v_magnitude: 0.5,
    maneuver_time_offset: 1167.0,
    energy_cost_joules: 93.75,
    fuel_mass_kg: 0.127,
    post_burn_tca: 2920.0,
    post_burn_min_distance: 5890.0,
    post_burn_relative_velocity: 8345.8,
    post_burn_risk_score: 6.8,
    post_burn_risk_level_str: "LOW",
    is_safe: true
  },
  {
    id: "MANEUVER_003",
    direction_name: "+Normal (+Cross-Track)",
    rtn_vector: [0.0, 0.0, 1.0],
    eci_delta_v: [0.12, 0.68, 0.72],
    delta_v_magnitude: 1.0,
    maneuver_time_offset: 1167.0,
    energy_cost_joules: 375.0,
    fuel_mass_kg: 0.254,
    post_burn_tca: 2967.0,
    post_burn_min_distance: 2840.0,
    post_burn_relative_velocity: 8349.0,
    post_burn_risk_score: 38.5,
    post_burn_risk_level_str: "MEDIUM",
    is_safe: true
  }
];

export const DEMO_OPTIMIZATION_RESULT: OptimizationResult = {
  satellite_id: "SAT_01",
  debris_id: "DEBRIS_01",
  original_min_distance: 189.4,
  original_risk_score: 96.4,
  original_risk_level: "CRITICAL",
  recommended_maneuver: DEMO_CANDIDATE_MANEUVERS[0],
  all_candidates: DEMO_CANDIDATE_MANEUVERS,
  explanation: "RECOMMENDED MANEUVER SELECTION: +Transverse (+In-Track) burn with ΔV = 0.50 m/s. SAFETY IMPACT: Miss distance increases from 189.4 m (CRITICAL) to 6.42 km (LOW). ENERGY EFFICIENCY: Requires only 93.8 Joules of kinetic energy change and 127 grams of propellant (75.0% savings vs 2.0 m/s maximum burn). ASTRODYNAMICS RATIONALE: In-track (Transverse) burns alter the semi-major axis, causing a cumulative time phasing shift along the orbit. Executing an in-track burn 30 minutes prior to TCA creates maximum miss distance per unit of ΔV compared to radial or cross-track burns.",
  fuel_saved_percentage: 75.0
};
