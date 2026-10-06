import math
import pytest
from app.simulation.scenarios import generate_scenario_debris
from app.simulation.conjunction import analyze_conjunction
from app.risk.risk_analyzer import calculate_risk_assessment
from app.optimization.maneuver_optimizer import optimize_avoidance_maneuver

def test_risk_and_optimization_scenario4():
    sat, debris_list = generate_scenario_debris(4)
    crit_debris = next(d for d in debris_list if d.id == "DEBRIS_401")
    
    conj = analyze_conjunction(sat, crit_debris, start_time=0.0, end_time=3600.0)
    risk = calculate_risk_assessment(conj, sat, crit_debris)
    
    # Critical threat should be CRITICAL or HIGH risk
    assert risk.risk_level in ["CRITICAL", "HIGH"]
    assert conj.min_distance < 1000.0
    
    # Run maneuver optimization
    opt = optimize_avoidance_maneuver(sat, crit_debris, conj, risk, safety_distance_threshold=1500.0)
    
    rec = opt.recommended_maneuver
    assert rec.post_burn_min_distance > conj.min_distance
    assert rec.post_burn_risk_score < risk.risk_score
    assert "RECOMMENDED MANEUVER" in opt.explanation
