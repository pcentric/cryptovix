'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  TooltipProps,
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

type Regime = 'LOW' | 'MODERATE' | 'HIGH';

function getRegime(value: number): Regime {
  if (value < 30) return 'LOW';
  if (value <= 50) return 'MODERATE';
  return 'HIGH';
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length > 0) {
    const dataPoint = payload[0].payload as ChartData;
    const value = payload[0].value as number;
    const regime = getRegime(value);

    const regimeColor = {
      LOW: 'text-emerald-400',
      MODERATE: 'text-yellow-400',
      HIGH: 'text-red-400',
    };

    const date = new Date(dataPoint.timestamp);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg">
        <p className="text-xs text-zinc-400 mb-1">
          {formattedDate} · {formattedTime} UTC
        </p>
        <p className="text-2xl font-bold text-zinc-100">{value.toFixed(2)}</p>
        <p className={`text-sm font-semibold ${regimeColor[regime]}`}>{regime} volatility</p>
      </div>
    );
  }
  return null;
}

export function VixChart({ tenor, data, isLoading }: VixChartProps) {
  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      {/* Header with title and legend */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">IV History ({tenor})</h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            <span className="text-zinc-400">Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-zinc-400">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span className="text-zinc-400">High</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="skeleton h-[380px] rounded-lg" />
      ) : data.length === 0 ? (
        <div className="h-[380px] flex items-center justify-center">
          <p className="text-zinc-400">No data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ivGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#3f3f46" strokeDasharray="0" />
            <XAxis
              dataKey="timestamp"
              stroke="#a1a1aa"
              tickFormatter={formatXAxis}
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#a1a1aa" style={{ fontSize: '12px' }} />
            <Tooltip cursor={{ stroke: '#52525b', strokeDasharray: '4 4' }} content={<CustomTooltip />} />
            <ReferenceLine y={30} stroke="#facc15" strokeDasharray="4 4" label={{ value: '30 (Moderate)', fill: '#facc15', fontSize: 12 }} />
            <ReferenceLine y={50} stroke="#f87171" strokeDasharray="4 4" label={{ value: '50 (High)', fill: '#f87171', fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#ivGradient)"
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
