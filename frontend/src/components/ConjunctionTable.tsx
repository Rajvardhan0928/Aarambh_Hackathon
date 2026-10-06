import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { ConjunctionSummaryItem } from '../types';

interface ConjunctionTableProps {
  conjunctions: ConjunctionSummaryItem[];
  selectedDebrisId: string | null;
  onSelectDebris: (debrisId: string) => void;
}

export const ConjunctionTable: React.FC<ConjunctionTableProps> = ({
  conjunctions,
  selectedDebrisId,
  onSelectDebris,
}) => {
  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'LOW':
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="bg-space-800/90 border border-gray-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold tracking-wider uppercase text-gray-200">
            Tracked Orbital Conjunctions ({conjunctions.length})
          </h2>
        </div>
        <span className="text-xs text-gray-400">Click row to inspect & optimize</span>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[380px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800 bg-space-900/60 uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-md">
              <th className="py-2.5 px-3">Debris Object</th>
              <th className="py-2.5 px-3">TCA (Time to TCA)</th>
              <th className="py-2.5 px-3">Min Distance</th>
              <th className="py-2.5 px-3">Rel Velocity</th>
              <th className="py-2.5 px-3">Risk Score</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 font-mono">
            {conjunctions.map((item) => {
              const { conjunction: conj, risk } = item;
              const isSelected = conj.debris_id === selectedDebrisId;
              const minsToTca = (conj.tca / 60.0).toFixed(1);
              const minDistStr =
                conj.min_distance < 1000
                  ? `${conj.min_distance.toFixed(1)} m`
                  : `${(conj.min_distance / 1000.0).toFixed(2)} km`;
              const relVelStr = `${(conj.relative_velocity / 1000.0).toFixed(2)} km/s`;

              return (
                <tr
                  key={conj.debris_id}
                  onClick={() => onSelectDebris(conj.debris_id)}
                  className={`cursor-pointer transition duration-150 ${
                    isSelected
                      ? 'bg-blue-600/20 border-l-4 border-l-blue-500 text-white font-semibold'
                      : 'hover:bg-space-700/50 text-gray-300'
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-gray-200">{conj.debris_name}</div>
                    <div className="text-[10px] text-gray-500 font-normal">{conj.debris_id}</div>
                  </td>
                  <td className="py-2.5 px-3 font-medium">
                    <div>{minsToTca} mins</div>
                    <div className="text-[10px] text-gray-500">t = {conj.tca.toFixed(0)}s</div>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-gray-100">{minDistStr}</td>
                  <td className="py-2.5 px-3 text-gray-300">{relVelStr}</td>
                  <td className="py-2.5 px-3 font-bold">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-12 bg-space-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            risk?.risk_score > 60 ? 'bg-red-500' : risk?.risk_score > 30 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, risk?.risk_score || 0)}%` }}
                        />
                      </div>
                      <span>{risk ? `${risk.risk_score.toFixed(0)}%` : '0%'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border ${getBadgeStyle(
                        risk?.risk_level || 'LOW'
                      )}`}
                    >
                      {risk?.risk_level || 'LOW'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDebris(conj.debris_id);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-space-700 hover:bg-blue-600 text-gray-200 hover:text-white rounded transition text-[11px] font-sans"
                    >
                      <span>INSPECT</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
