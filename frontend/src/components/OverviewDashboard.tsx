import React from 'react';
import { Satellite, ShieldAlert, AlertTriangle, Activity, Database, Rocket, PlayCircle, Upload, RotateCcw } from 'lucide-react';
import { SpaceObject, ConjunctionSummaryItem, Scenario } from '../types';

interface OverviewDashboardProps {
  targetSatellite: SpaceObject | null;
  debrisCount: number;
  conjunctions: ConjunctionSummaryItem[];
  scenarios: Scenario[];
  activeScenarioId: number;
  isDemoMode: boolean;
  onSelectScenario: (id: number) => void;
  onStartDemoMode: () => void;
  onResetDemo: () => void;
  onOpenTLEModal: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  targetSatellite,
  debrisCount,
  conjunctions,
  scenarios,
  activeScenarioId,
  isDemoMode,
  onSelectScenario,
  onStartDemoMode,
  onResetDemo,
  onOpenTLEModal
}) => {
  const highRiskCount = conjunctions.filter(
    (c) => c.risk && (c.risk.risk_level === 'HIGH' || c.risk.risk_level === 'CRITICAL')
  ).length;

  return (
    <div className="w-full space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-space-800/80 border border-gray-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400">
            <Satellite className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">AARAMBH SPACE SAFETY</h1>
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                isDemoMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {isDemoMode ? 'SIMULATED DEMO DATA' : 'SYSTEM ONLINE'}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Autonomous Orbital Conjunction Detection & Low-Energy Collision Avoidance Engine
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scenario Selector */}
          <select
            value={activeScenarioId}
            onChange={(e) => onSelectScenario(Number(e.target.value))}
            className="bg-space-700 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>

          {/* Reset Demo State Button */}
          <button
            onClick={onResetDemo}
            className="flex items-center space-x-1.5 px-3 py-2 bg-space-700 hover:bg-space-600 text-gray-200 text-xs font-semibold rounded-lg border border-gray-700 transition"
            title="Reset Deterministic Demo State"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>RESET DEMO</span>
          </button>

          {/* Upload TLE Button */}
          <button
            onClick={onOpenTLEModal}
            className="flex items-center space-x-1.5 px-3 py-2 bg-space-700 hover:bg-space-600 text-gray-200 text-xs font-semibold rounded-lg border border-gray-700 transition"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>IMPORT TLE</span>
          </button>

          {/* Master Hackathon Demo Mode Trigger */}
          <button
            onClick={onStartDemoMode}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs rounded-lg shadow-lg shadow-amber-500/20 transition transform active:scale-95"
          >
            <PlayCircle className="w-4 h-4" />
            <span>HACKATHON DEMO MODE</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Tracked Objects */}
        <div className="bg-space-800/90 border border-gray-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>TRACKED OBJECTS</span>
            <Database className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{debrisCount + 1}</span>
            <span className="text-[11px] text-gray-400">1 Sat + {debrisCount} Debris</span>
          </div>
        </div>

        {/* Card 2: Space Debris Count */}
        <div className="bg-space-800/90 border border-gray-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>DEBRIS FRAGMENTS</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-400">{debrisCount}</span>
            <span className="text-[11px] text-gray-400">LEO Tracking</span>
          </div>
        </div>

        {/* Card 3: Total Conjunctions */}
        <div className="bg-space-800/90 border border-gray-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>CONJUNCTIONS</span>
            <AlertTriangle className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{conjunctions.length}</span>
            <span className="text-[11px] text-gray-400">24h Propagation</span>
          </div>
        </div>

        {/* Card 4: High-Risk Conjunctions */}
        <div className="bg-space-800/90 border border-gray-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>HIGH-RISK THREATS</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black ${highRiskCount > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {highRiskCount}
            </span>
            <span className="text-[11px] text-gray-400">{highRiskCount > 0 ? 'Action Required' : 'Nominal'}</span>
          </div>
        </div>

        {/* Card 5: Target Satellite Info */}
        <div className="bg-space-800/90 border border-gray-800/90 rounded-xl p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>TARGET SATELLITE</span>
            <Rocket className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-white truncate">{targetSatellite?.name || 'Aarambh-Sat-1'}</div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between mt-0.5">
              <span>Alt: ~550 km</span>
              <span>Inc: 51.6°</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
