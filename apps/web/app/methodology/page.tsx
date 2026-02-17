import Link from 'next/link';

export default async function MethodologyPage() {
  const apiUrl = process.env.API_BASE_URL || 'http://localhost:3001';

  let methodology = null;
  try {
    const response = await fetch(`${apiUrl}/api/v1/index/methodology`);
    const json = await response.json();
    methodology = json.data;
  } catch (error) {
    console.error('Failed to fetch methodology:', error);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
            ← Back to Index
          </Link>
          <h1 className="text-4xl font-bold text-emerald-400 mb-2">Methodology</h1>
          <p className="text-zinc-400">How CryptoVIX is calculated</p>
        </div>

        {methodology ? (
          <div className="space-y-8">
            {/* Overview */}
            <section className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4">Overview</h2>
              <p className="text-zinc-300 mb-4">{methodology.description}</p>
              <p className="text-zinc-400 text-sm">{methodology.disclaimer}</p>
            </section>

            {/* Calculation */}
            <section className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4">Index Calculation</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-zinc-400 text-sm mb-2">Formula:</p>
                  <code className="bg-zinc-800 p-4 rounded text-sm text-emerald-400 block overflow-x-auto">
                    CryptoVIX = (Deribit DVOL × 60%) + (Bybit IV × 40%)
                  </code>
                </div>
                <div>
                  <p className="text-zinc-400 text-sm mb-2">Update Frequency:</p>
                  <p className="text-zinc-200">{methodology.methodology.dataFrequency}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-sm mb-2">Base Asset:</p>
                  <p className="text-zinc-200">{methodology.methodology.baseCoin}</p>
                </div>
              </div>
            </section>

            {/* Data Sources */}
            <section className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4">Data Sources</h2>
              <div className="space-y-4">
                <div className="border-l-2 border-emerald-400 pl-4">
                  <h3 className="font-semibold text-emerald-400 mb-2">Deribit (60% weight)</h3>
                  <p className="text-zinc-400 text-sm">
                    Primary source using Deribit DVOL index from BTC options book summary. Fetches
                    mark implied volatility across all active options.
                  </p>
                </div>
                <div className="border-l-2 border-emerald-400 pl-4">
                  <h3 className="font-semibold text-emerald-400 mb-2">Bybit (40% weight)</h3>
                  <p className="text-zinc-400 text-sm">
                    Secondary source using Bybit mark implied volatility from option tickers. Uses
                    instruments-info API (cached 30 minutes) for accurate expiry mapping.
                  </p>
                </div>
              </div>
            </section>

            {/* Filtering */}
            <section className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4">Data Filtering & Quality</h2>
              <ul className="space-y-2 text-zinc-300">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">✓</span>
                  <span>
                    <strong>Staleness Filter:</strong> Options data must be less than {methodology.methodology.filtering.maxStaleness} old
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">✓</span>
                  <span>
                    <strong>Mid-price Filter:</strong> Requires valid bid/ask to compute mid-price (mid &gt;
                    0)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">✓</span>
                  <span>
                    <strong>Expired Options:</strong> Automatically excludes options past expiration
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">✓</span>
                  <span>
                    <strong>Venue Fallback:</strong> If one venue is unavailable, index continues with available
                    data (confidence score adjusted)
                  </span>
                </li>
              </ul>
            </section>

            {/* Confidence */}
            <section className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4">Confidence Score</h2>
              <p className="text-zinc-300 mb-4">
                The confidence score (0-100) reflects data quality and availability:
              </p>
              <ul className="space-y-2 text-zinc-300 text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400">→</span>
                  <span>
                    <strong>90%+:</strong> Both venues healthy, good data depth
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400">→</span>
                  <span>
                    <strong>70-89%:</strong> One venue has degraded performance or limited data
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400">→</span>
                  <span>
                    <strong>&lt;70%:</strong> Significant data issues or venue unavailability
                  </span>
                </li>
              </ul>
            </section>

            {/* Disclaimers */}
            <section className="bg-red-900/20 rounded-lg p-6 border border-red-800">
              <h2 className="text-2xl font-semibold mb-4 text-red-400">Disclaimers</h2>
              <ul className="space-y-2 text-zinc-300 text-sm">
                <li>This index is provided for informational purposes only.</li>
                <li>
                  Implied volatility is a forward-looking metric derived from option prices and does not
                  guarantee future realized volatility.
                </li>
                <li>Past performance is not indicative of future results.</li>
                <li>
                  Data is aggregated from public APIs of Deribit and Bybit. Transmission delays or API
                  issues may cause temporary inaccuracies.
                </li>
                <li>Use this index at your own risk and conduct your own research before making decisions.</li>
              </ul>
            </section>

            {/* Contact */}
            <section className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4">Contact & Feedback</h2>
              <p className="text-zinc-300 mb-4">
                Questions or suggestions? Visit our GitHub:
              </p>
              <a
                href={methodology.contact}
                className="text-emerald-400 hover:text-emerald-300 font-semibold"
                target="_blank"
                rel="noopener noreferrer"
              >
                {methodology.contact} →
              </a>
            </section>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
            <p className="text-zinc-400">Failed to load methodology. Please try again later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
