'use client';

interface ComponentBreakdownProps {
  deribitIv: number;
  bybitIv: number;
}

export function ComponentBreakdown({ deribitIv, bybitIv }: ComponentBreakdownProps) {
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <h2 className="text-lg font-semibold mb-4">Venue Breakdown</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-800 rounded p-4">
          <p className="text-zinc-400 text-sm mb-2">Deribit IV</p>
          <p className="text-2xl font-bold text-emerald-400">{deribitIv != null ? deribitIv.toFixed(2) : '—'}</p>
          <p className="text-xs text-zinc-500 mt-2">60% weight in index</p>
        </div>
        <div className="bg-zinc-800 rounded p-4">
          <p className="text-zinc-400 text-sm mb-2">Bybit IV</p>
          <p className="text-2xl font-bold text-emerald-400">{bybitIv != null ? bybitIv.toFixed(2) : '—'}</p>
          <p className="text-xs text-zinc-500 mt-2">40% weight in index</p>
        </div>
      </div>
    </div>
  );
}
