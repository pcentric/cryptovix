'use client';

interface ComponentBreakdownProps {
  deribitIv: number;
  bybitIv: number;
}

export function ComponentBreakdown({ deribitIv, bybitIv }: ComponentBreakdownProps) {
  // Weights for each venue
  const deribitWeight = 60;
  const bybitWeight = 40;

  // Calculate contributions
  // deribitIv arrives as percentage (e.g., 52.4) - use as-is
  // bybitIv arrives as decimal (e.g., 0.48) - multiply by 100 to get percentage
  const deribitValue = deribitIv;
  const bybitValue = bybitIv * 100;
  const deribitContribution = deribitValue * (deribitWeight / 100);
  const bybitContribution = bybitValue * (bybitWeight / 100);
  const weightedAverage = deribitContribution + bybitContribution;

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <h2 className="text-lg font-semibold mb-2">Venue Breakdown</h2>

      {/* Header row with weighted average */}
      <div className="mb-6 pb-4 border-b border-zinc-800">
        <p className="text-sm text-zinc-400">Weighted Average Index</p>
        <p className="text-3xl font-bold text-emerald-400">{weightedAverage.toFixed(2)}%</p>
      </div>

      {/* Venues grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deribit */}
        <div className="bg-zinc-800/50 rounded-lg p-5 border border-zinc-700">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm text-zinc-400 mb-1">Deribit IV</p>
              <p className="text-3xl font-bold text-emerald-400">
                {deribitValue != null ? deribitValue.toFixed(2) : '—'}%
              </p>
            </div>
            <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-400">
              {deribitWeight}% weight
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-3 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${deribitWeight}%` }}></div>
          </div>

          {/* Contribution */}
          <p className="text-xs text-zinc-400">Contribution to index: {deribitContribution.toFixed(2)} pts</p>
        </div>

        {/* Bybit */}
        <div className="bg-zinc-800/50 rounded-lg p-5 border border-zinc-700">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm text-zinc-400 mb-1">Bybit IV</p>
              <p className="text-3xl font-bold text-emerald-400">
                {bybitValue != null ? bybitValue.toFixed(2) : '—'}%
              </p>
            </div>
            <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-400">
              {bybitWeight}% weight
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-3 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${bybitWeight}%` }}></div>
          </div>

          {/* Contribution */}
          <p className="text-xs text-zinc-400">Contribution to index: {bybitContribution.toFixed(2)} pts</p>
        </div>
      </div>
    </div>
  );
}
