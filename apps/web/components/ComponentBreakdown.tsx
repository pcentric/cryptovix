'use client';

interface ComponentBreakdownProps {
  deribitIv: number;
  bybitIv: number;
  weightedAvg: number;
}

export function ComponentBreakdown({ deribitIv, bybitIv, weightedAvg }: ComponentBreakdownProps) {
  // Weights for each venue
  const deribitWeight = 60;
  const bybitWeight = 40;

  // Determine if Bybit is available
  const bybitAvailable = bybitIv > 0;

  // Both deribitIv and bybitIv arrive as percentages from API (e.g., 52.4, 46.88)
  // Use values directly - no conversion needed
  const deribitDisplay = deribitIv;
  const bybitDisplay = bybitIv;

  // Calculate contributions (mirrors backend renormalization logic)
  const deribitAvailable = deribitIv > 0;
  let deribitContribution = 0;
  let bybitContribution = 0;

  if (deribitAvailable && bybitAvailable) {
    // Both venues: 60% Deribit + 40% Bybit
    deribitContribution = deribitIv * 0.6;
    bybitContribution = bybitIv * 0.4;
  } else if (deribitAvailable) {
    // Only Deribit: 100% Deribit
    deribitContribution = deribitIv;
  } else if (bybitAvailable) {
    // Only Bybit: 100% Bybit
    bybitContribution = bybitIv;
  }

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <h2 className="text-lg font-semibold mb-2">Venue Breakdown</h2>

      {/* Header row with weighted average */}
      <div className="mb-6 pb-4 border-b border-zinc-800">
        <p className="text-sm text-zinc-400">Weighted Average Index</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-emerald-400">{weightedAvg.toFixed(2)}%</p>
          {!bybitAvailable && (
            <p className="text-xs text-zinc-500">Deribit only — Bybit offline</p>
          )}
        </div>
      </div>

      {/* Venues grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deribit */}
        <div className="bg-zinc-800/50 rounded-lg p-5 border border-zinc-700">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm text-zinc-400 mb-1">Deribit IV</p>
              <p className="text-3xl font-bold text-emerald-400">
                {deribitDisplay != null ? deribitDisplay.toFixed(2) : '—'}%
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
              <p className={`text-3xl font-bold ${bybitAvailable ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {bybitAvailable ? bybitDisplay.toFixed(2) + '%' : '—'}
              </p>
            </div>
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                bybitAvailable
                  ? 'bg-emerald-400/20 text-emerald-400'
                  : 'bg-red-400/20 text-red-400'
              }`}
            >
              {bybitAvailable ? `${bybitWeight}% weight` : 'Offline'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-3 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${bybitAvailable ? 'bg-emerald-400' : 'bg-zinc-600'}`}
              style={{ width: bybitAvailable ? `${bybitWeight}%` : '100%' }}
            ></div>
          </div>

          {/* Contribution */}
          <p className="text-xs text-zinc-400">
            Contribution to index: {bybitAvailable ? bybitContribution.toFixed(2) + ' pts' : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
