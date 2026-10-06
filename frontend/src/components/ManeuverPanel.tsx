import React from 'react';
import { Rocket, CheckCircle2, Zap, Award, HelpCircle } from 'lucide-react';
import { OptimizationResult, ManeuverCandidate } from '../types';

interface ManeuverPanelProps {
  optimizationResult: OptimizationResult | null;
  onOptimize: () => void;
  isOptimizing: boolean;
}

export const ManeuverPanel: React.FC<ManeuverPanelProps> = ({
  optimizationResult,
  onOptimize,
  isOptimizing,
}) => {
  if (!optimizationResult) {
    return (
      <div className="bg-space-800/90 border border-gray-800 rounded-xl p-5 shadow-xl text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400">
            <Rocket className="w-6 h-6" />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Collision Avoidance Maneuver Engine</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
            Generate and evaluate local RTN orbital maneuvers (In-Track, Cross-Track, Radial) to identify the minimum-energy burn that guarantees safe separation.
          </p>
        </div>
        <button
          onClick={onOptimize}
          disabled={isOptimizing}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-blue-500/20 transition transform active:scale-95 disabled:opacity-50"
        >
          {isOptimizing ? 'CALCULATING OPTIMAL ΔV...' : 'COMPUTE LOW-ENERGY AVOIDANCE MANEUVER'}
        </button>
      </div>
    );
  }

  const { recommended_maneuver: rec, all_candidates, explanation, fuel_saved_percentage } = optimizationResult;

  return (
    <div className="bg-space-800/90 border border-gray-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200">
            Optimal Collision Avoidance Maneuver
          </h3>
        </div>
        <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-md flex items-center space-x-1">
          <Zap className="w-3.5 h-3.5" />
          <span>{fuel_saved_percentage.toFixed(1)}% Fuel Saved</span>
        </span>
      </div>

      {/* Recommended Maneuver Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-space-900 to-blue-950/40 border border-emerald-500/40 rounded-xl p-4 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-mono uppercase">Selected Candidate</div>
              <div className="text-base font-bold text-white">{rec.direction_name}</div>
            </div>
          </div>

          <div className="flex items-center space-x-4 font-mono text-xs">
            <div className="bg-space-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
              <span className="text-gray-400 text-[10px] block">DELTA-V</span>
              <span className="text-sm font-bold text-emerald-400">{rec.delta_v_magnitude.toFixed(2)} m/s</span>
            </div>
            <div className="bg-space-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
              <span className="text-gray-400 text-[10px] block">ENERGY</span>
              <span className="text-sm font-bold text-blue-400">{rec.energy_cost_joules.toFixed(1)} J</span>
            </div>
            <div className="bg-space-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
              <span className="text-gray-400 text-[10px] block">POST-BURN MISS</span>
              <span className="text-sm font-bold text-white">{(rec.post_burn_min_distance / 1000.0).toFixed(2)} km</span>
            </div>
          </div>
        </div>
      </div>

      {/* Explainability Rationale */}
      <div className="bg-space-900/80 border border-gray-800 rounded-lg p-3 text-xs space-y-1">
        <div className="flex items-center space-x-1.5 text-blue-400 font-bold uppercase text-[11px]">
          <HelpCircle className="w-4 h-4" />
          <span>Astrodynamics Decision Rationale</span>
        </div>
        <p className="text-gray-300 leading-relaxed font-sans">{explanation}</p>
      </div>

      {/* Candidate Maneuvers Comparative Table */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Evaluated ΔV Candidates ({all_candidates.length})
        </div>
        <div className="overflow-x-auto max-h-48">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800 bg-space-900/60 uppercase text-[10px]">
                <th className="py-2 px-3">Burn Direction</th>
                <th className="py-2 px-3">ΔV Magnitude</th>
                <th className="py-2 px-3">Energy Cost</th>
                <th className="py-2 px-3">Propellant</th>
                <th className="py-2 px-3">Post-Burn Miss</th>
                <th className="py-2 px-3">New Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {all_candidates.slice(0, 10).map((cand) => {
                const isRec = cand.id === rec.id;
                return (
                  <tr
                    key={cand.id}
                    className={
                      isRec
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border-l-4 border-l-emerald-500'
                        : 'text-gray-300 hover:bg-space-700/40'
                    }
                  >
                    <td className="py-2 px-3">{cand.direction_name}</td>
                    <td className="py-2 px-3 font-bold">{cand.delta_v_magnitude.toFixed(2)} m/s</td>
                    <td className="py-2 px-3">{cand.energy_cost_joules.toFixed(1)} J</td>
                    <td className="py-2 px-3">{(cand.fuel_mass_kg * 1000).toFixed(1)} g</td>
                    <td className="py-2 px-3">{(cand.post_burn_min_distance / 1000.0).toFixed(2)} km</td>
                    <td className="py-2 px-3 font-semibold">{cand.post_burn_risk_level_str}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
