'use client';

interface StatsBarProps {
  btcPrice: number;
  lastUpdated: string;
}

export function StatsBar({ btcPrice, lastUpdated }: StatsBarProps) {
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-zinc-400 text-sm mb-1">BTC Price</p>
          <p className="text-2xl font-semibold text-emerald-400">
            ${btcPrice != null ? btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
          </p>
        </div>
        <div>
          <p className="text-zinc-400 text-sm mb-1">Last Updated</p>
          <p className="text-sm font-semibold">
            {new Date(lastUpdated).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'UTC',
            })}{' '}
            UTC
          </p>
        </div>
      </div>
    </div>
  );
}
