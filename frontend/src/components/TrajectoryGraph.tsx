import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts';
import { GraphPoint } from '../types';
import { LineChart as ChartIcon } from 'lucide-react';

interface TrajectoryGraphProps {
  graphPoints: GraphPoint[];
  tcaSec: number;
  minDistanceM: number;
  hasManeuver: boolean;
}

export const TrajectoryGraph: React.FC<TrajectoryGraphProps> = ({
  graphPoints,
  tcaSec,
  minDistanceM,
  hasManeuver
}) => {
  if (!graphPoints || graphPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-space-800/80 rounded-xl border border-gray-800 text-gray-500 text-xs">
        Select a debris object to view trajectory separation graph.
      </div>
    );
  }

  return (
    <div className="bg-space-800/90 border border-gray-800 rounded-xl p-4 shadow-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ChartIcon className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
            Relative Trajectory Distance vs Time (Around TCA)
          </h3>
        </div>
        <div className="flex items-center space-x-4 text-[11px] font-mono">
          <span className="text-red-400 font-semibold">
            TCA Min Separation: {minDistanceM < 1000 ? `${minDistanceM.toFixed(1)}m` : `${(minDistanceM/1000).toFixed(2)}km`}
          </span>
          <span className="text-amber-400 font-semibold">Safety Sphere: 5.0 km</span>
        </div>
      </div>

      <div className="w-full h-64 font-mono text-xs pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={graphPoints} margin={{ top: 10, right: 30, left: 10, bottom: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="time_to_tca_mins"
              stroke="#9ca3af"
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}m`}
              label={{ value: 'Time Relative to TCA (Minutes)', position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 11 }}
            />
            <YAxis
              stroke="#9ca3af"
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
              label={{ value: 'Distance (m)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px', color: '#f3f4f6' }}
              formatter={(value: any, name: any) => [
                typeof value === 'number'
                  ? value >= 1000
                    ? `${(value / 1000).toFixed(2)} km (${value.toFixed(0)} m)`
                    : `${value.toFixed(1)} m`
                  : value,
                name === 'distance_m' ? 'Original Unperturbed Separation' : 'Post-Maneuver Separation'
              ]}
              labelFormatter={(label) => `TCA Offset: ${label > 0 ? '+' : ''}${label} mins`}
            />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />

            {/* Safety Margin Reference Lines */}
            <ReferenceLine y={5000} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '5 km Safety Sphere', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
            <ReferenceLine y={500} stroke="#ef4444" strokeDasharray="2 2" label={{ value: '500m Critical Limit', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
            <ReferenceLine x={0} stroke="#3b82f6" label={{ value: 'TCA', fill: '#3b82f6', fontSize: 10, position: 'insideTopLeft' }} />

            {/* Original Separation Line */}
            <Line
              type="monotone"
              dataKey="distance_m"
              name="Original Separation"
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6 }}
            />

            {/* Avoidance Post-Burn Line */}
            {hasManeuver && (
              <Line
                type="monotone"
                dataKey="post_maneuver_distance_m"
                name="Post-Avoidance Maneuver Separation"
                stroke="#10b981"
                strokeWidth={3.0}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
