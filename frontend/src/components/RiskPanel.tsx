import React from 'react';
import { ShieldAlert, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { RiskAssessment } from '../types';

interface RiskPanelProps {
  risk: RiskAssessment | null;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({ risk }) => {
  if (!risk) {
    return (
      <div className="bg-space-800/90 border border-gray-800 rounded-xl p-4 text-center text-gray-500 text-xs flex items-center justify-center h-full">
        Select a conjunction event to view detailed collision risk assessment.
      </div>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-500 bg-red-500/20 border-red-500/40';
      case 'HIGH':
        return 'text-orange-400 bg-orange-500/20 border-orange-500/40';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
      case 'LOW':
      default:
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
    }
  };

  const getMeterColor = (score: number) => {
    if (score >= 70) return 'from-orange-500 to-red-600';
    if (score >= 40) return 'from-amber-400 to-orange-500';
    if (score >= 15) return 'from-yellow-400 to-amber-400';
    return 'from-emerald-400 to-teal-500';
  };

  return (
    <div className="bg-space-800/90 border border-gray-800 rounded-xl p-4 shadow-xl space-y-4 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
            Collision Risk Analysis
          </h3>
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-black rounded-md border ${getRiskColor(risk.risk_level)}`}>
          {risk.risk_level} THREAT
        </span>
      </div>

      {/* Visual Risk Gauge / Meter */}
      <div className="space-y-2 bg-space-900/80 p-3.5 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-300 font-semibold">Prototype Risk Score</span>
          <span className="text-lg font-black font-mono text-white">{risk.risk_score.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-space-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-gray-700">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getMeterColor(risk.risk_score)} transition-all duration-500 shadow-sm`}
            style={{ width: `${Math.min(100, risk.risk_score)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
          <span>0% (Safe)</span>
          <span>100% (Critical)</span>
        </div>
      </div>

      {/* Mathematical Pc & Physical Parameters Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-space-900/60 p-2.5 rounded-lg border border-gray-800">
          <div className="text-[10px] text-gray-400 uppercase">Simplified 2D Pc</div>
          <div className="text-sm font-bold text-blue-400 mt-0.5">
            {risk.probability_of_collision === 0
              ? '< 1e-12'
              : risk.probability_of_collision.toExponential(2)}
          </div>
        </div>
        <div className="bg-space-900/60 p-2.5 rounded-lg border border-gray-800">
          <div className="text-[10px] text-gray-400 uppercase">Position Uncertainty (1-σ)</div>
          <div className="text-sm font-bold text-gray-200 mt-0.5">
            ±{risk.position_uncertainty_std.toFixed(1)} m
          </div>
        </div>
      </div>

      {/* Contributing Risk Factors List */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase text-gray-400 tracking-wider">
          Contributing Risk Factors
        </div>
        <ul className="space-y-1.5 text-xs text-gray-300">
          {risk.risk_factors.map((factor, idx) => (
            <li key={idx} className="flex items-start space-x-2 bg-space-900/40 p-2 rounded border border-gray-800/80">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-snug text-[11px]">{factor}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Required Hackathon Scientific Disclaimer */}
      <div className="p-2.5 bg-blue-950/30 border border-blue-800/40 rounded-lg text-[10px] text-blue-300 flex items-start space-x-2 leading-relaxed">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <span>
          <strong>Prototype Disclaimer:</strong> {risk.disclaimer}
        </span>
      </div>
    </div>
  );
};
