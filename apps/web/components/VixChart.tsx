'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  timestamp: string;
  value: number;
}

interface VixChartProps {
  tenor: '7d' | '30d' | '60d' | '90d';
  data: ChartData[];
  isLoading: boolean;
}

export function VixChart({ tenor, data, isLoading }: VixChartProps) {
  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <h2 className="text-lg font-semibold mb-6">IV History ({tenor})</h2>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-zinc-400">Loading...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-zinc-400">No data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="timestamp"
              stroke="#a1a1aa"
              tickFormatter={formatXAxis}
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#a1a1aa" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fafafa' }}
              formatter={(value: any) => value.toFixed(2)}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
