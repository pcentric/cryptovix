'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Diagnostics {
  metrics: {
    lastUpdate: string;
    confidence: number;
    venuesAvailable: { deribit: boolean; bybit: boolean };
    totalRequests: number;
  };
  latestReading: {
    value: number;
    deribitIv: number;
    bybitIv: number;
    btcPrice: number;
    timestamp: string;
  } | null;
  health: {
    apiStatus: string;
    databaseStatus: string;
    uptime: number;
  };
}

export default function StatusPage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/v1/diagnostics`);
        const json = await response.json();

        if (json.status === 'ok' && json.data) {
          setDiagnostics(json.data);
        } else {
          setError('Failed to load diagnostics');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 10 * 1000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    return status === 'ok' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10';
  };

  const getUptimeText = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
            ← Back to Index
          </Link>
          <h1 className="text-4xl font-bold text-emerald-400 mb-2">System Status</h1>
          <p className="text-zinc-400">Real-time health and diagnostics</p>
        </div>

        {isLoading ? (
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 flex items-center justify-center h-96">
            <p className="text-zinc-400">Loading diagnostics...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 rounded-lg p-6 border border-red-800">
            <p className="text-red-400">{error}</p>
          </div>
        ) : diagnostics ? (
          <div className="space-y-6">
            {/* Overall Health */}
            <section className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4">Overall Health</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded border border-zinc-800 ${getStatusColor(diagnostics.health.apiStatus)}`}>
                  <p className="text-sm text-zinc-400 mb-1">API Status</p>
                  <p className="text-lg font-semibold capitalize">{diagnostics.health.apiStatus}</p>
                </div>
                <div className={`p-4 rounded border border-zinc-800 ${getStatusColor(diagnostics.health.databaseStatus)}`}>
                  <p className="text-sm text-zinc-400 mb-1">Database Status</p>
                  <p className="text-lg font-semibold capitalize">{diagnostics.health.databaseStatus}</p>
                </div>
                <div className="p-4 rounded border border-zinc-800 bg-zinc-800">
                  <p className="text-sm text-zinc-400 mb-1">Uptime</p>
                  <p className="text-lg font-semibold">{getUptimeText(diagnostics.health.uptime)}</p>
                </div>
              </div>
            </section>

            {/* Venues */}
            <section className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4">Data Venues</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded border ${
                    diagnostics.metrics.venuesAvailable.deribit
                      ? 'border-emerald-400 bg-emerald-400/10'
                      : 'border-red-400 bg-red-400/10'
                  }`}
                >
                  <p className="text-sm mb-2">Deribit</p>
                  <p className={`text-lg font-semibold ${diagnostics.metrics.venuesAvailable.deribit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {diagnostics.metrics.venuesAvailable.deribit ? '✓ Available' : '✗ Unavailable'}
                  </p>
                </div>
                <div
                  className={`p-4 rounded border ${
                    diagnostics.metrics.venuesAvailable.bybit ? 'border-emerald-400 bg-emerald-400/10' : 'border-red-400 bg-red-400/10'
                  }`}
                >
                  <p className="text-sm mb-2">Bybit</p>
                  <p className={`text-lg font-semibold ${diagnostics.metrics.venuesAvailable.bybit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {diagnostics.metrics.venuesAvailable.bybit ? '✓ Available' : '✗ Unavailable'}
                  </p>
                </div>
              </div>
            </section>

            {/* Metrics */}
            <section className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4">Current Metrics</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                  <p className="text-zinc-400">Confidence Score</p>
                  <p className="text-lg font-semibold text-emerald-400">{diagnostics.metrics.confidence}%</p>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                  <p className="text-zinc-400">Last Updated</p>
                  <p className="text-sm">
                    {new Date(diagnostics.metrics.lastUpdate).toLocaleString('en-US', { timeZone: 'UTC' })} UTC
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-zinc-400">Total API Requests</p>
                  <p className="text-lg font-semibold">{diagnostics.metrics.totalRequests.toLocaleString()}</p>
                </div>
              </div>
            </section>

            {/* Latest Reading */}
            {diagnostics.latestReading ? (
              <section className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                <h2 className="text-2xl font-semibold mb-4">Latest VIX Reading</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                    <p className="text-zinc-400">CryptoVIX Value</p>
                    <p className="text-2xl font-bold text-emerald-400">{diagnostics.latestReading.value.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                    <p className="text-zinc-400">Deribit IV</p>
                    <p className="text-lg">{diagnostics.latestReading.deribitIv.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                    <p className="text-zinc-400">Bybit IV</p>
                    <p className="text-lg">{diagnostics.latestReading.bybitIv.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                    <p className="text-zinc-400">BTC Price</p>
                    <p className="text-lg">
                      ${diagnostics.latestReading.btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-zinc-400">Timestamp</p>
                    <p className="text-sm">
                      {new Date(diagnostics.latestReading.timestamp).toLocaleString('en-US', { timeZone: 'UTC' })} UTC
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <div className="bg-yellow-900/20 rounded-lg p-6 border border-yellow-800">
                <p className="text-yellow-400">No readings recorded yet</p>
              </div>
            )}

            {/* Info */}
            <section className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-sm text-zinc-400">
              <p>Status page auto-refreshes every 10 seconds. All times shown in UTC.</p>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
