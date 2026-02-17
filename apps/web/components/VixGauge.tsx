'use client';

interface VixGaugeProps {
  value: number;
  change24h: number | null;
  changePercent24h: number | null;
}

export function VixGauge({ value, change24h, changePercent24h }: VixGaugeProps) {
  let colorClass = 'text-emerald-400';
  if (value >= 30 && value <= 50) {
    colorClass = 'text-yellow-400';
  } else if (value > 50) {
    colorClass = 'text-red-400';
  }

  const changeSign = change24h !== null && change24h > 0 ? '+' : '';

  return (
    <div className="bg-zinc-900 rounded-lg p-8 border border-zinc-800">
      <div className="text-center">
        <p className="text-zinc-400 text-sm mb-2">Current CryptoVIX</p>
        <p className={`text-6xl font-bold ${colorClass} mb-4`}>{value != null ? value.toFixed(2) : '—'}</p>

        {change24h !== null && (
          <div className="text-zinc-300">
            <p className="text-sm">
              {changeSign}
              {change24h.toFixed(2)} ({changePercent24h?.toFixed(1)}%)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
