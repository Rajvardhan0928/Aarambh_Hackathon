export interface OrbitalElements {
  semi_major_axis: number;
  eccentricity: number;
  inclination: number;
  raan: number;
  arg_of_perigee: number;
  mean_anomaly: number;
  epoch_offset: number;
}

export interface SpaceObject {
  id: string;
  name: string;
  object_type: string;
  mass: number;
  radius: number;
  elements?: OrbitalElements;
  tle_line1?: string;
  tle_line2?: string;
  position_uncertainty_std: number;
}

export interface StateVector {
  position: [number, number, number];
  velocity: [number, number, number];
  time_offset: number;
}

export interface ConjunctionResult {
  satellite_id: string;
  debris_id: string;
  debris_name: string;
  tca: number;
  min_distance: number;
  relative_velocity: number;
  relative_position_vec: [number, number, number];
  relative_velocity_vec: [number, number, number];
  sat_position_at_tca: [number, number, number];
  sat_velocity_at_tca: [number, number, number];
  debris_position_at_tca: [number, number, number];
  debris_velocity_at_tca: [number, number, number];
}

export interface RiskAssessment {
  satellite_id: string;
  debris_id: string;
  debris_name: string;
  tca: number;
  min_distance: number;
  relative_velocity: number;
  probability_of_collision: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  combined_radius: number;
  position_uncertainty_std: number;
  risk_factors: string[];
  disclaimer: string;
}

export interface ManeuverCandidate {
  id: string;
  direction_name: string;
  rtn_vector: [number, number, number];
  eci_delta_v: [number, number, number];
  delta_v_magnitude: number;
  maneuver_time_offset: number;
  energy_cost_joules: number;
  fuel_mass_kg: number;
  post_burn_tca: number;
  post_burn_min_distance: number;
  post_burn_relative_velocity: number;
  post_burn_risk_score: number;
  post_burn_risk_level_str: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  is_safe: boolean;
}

export interface OptimizationResult {
  satellite_id: string;
  debris_id: string;
  original_min_distance: number;
  original_risk_score: number;
  original_risk_level: string;
  recommended_maneuver: ManeuverCandidate;
  all_candidates: ManeuverCandidate[];
  explanation: string;
  fuel_saved_percentage: number;
}

export interface ConjunctionSummaryItem {
  conjunction: ConjunctionResult;
  risk: RiskAssessment;
}

export interface GraphPoint {
  time_offset: number;
  time_to_tca_mins: number;
  distance_m: number;
  post_maneuver_distance_m: number | null;
}

export interface ConjunctionDetailResponse {
  conjunction: ConjunctionResult;
  risk: RiskAssessment;
  graph_points: GraphPoint[];
  optimization_result?: OptimizationResult;
}

export interface Scenario {
  id: number;
  name: string;
  description: string;
  risk_level: string;
}
