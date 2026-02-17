'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VixGauge } from '@/components/VixGauge';
import { VixChart } from '@/components/VixChart';
import { ComponentBreakdown } from '@/components/ComponentBreakdown';
import { StatsBar } from '@/components/StatsBar';

interface VixIndexData {
  value: number;
  timestamp: string;
  change24h: number | null;
  changePercent24h: number | null;
  confidence: number;
  venuesUsed: string[];
  lastUpdated: string;
  components: {
    deribitIv: number;
    bybitIv: number;
    weightedAvg: number;
  };
  metadata: {
    btcPrice: number;
  };
}

interface ChartData {
  timestamp: string;
  value: number;
}

export default function Dashboard() {
  const [vixData, setVixData] = useState<VixIndexData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [tenor, setTenor] = useState<'7d' | '30d' | '60d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Fetch current VIX data
  const fetchVixData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/index`);
      const json = await response.json();

      if (json.status === 'ok' && json.data) {
        setVixData(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch VIX data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch historical chart data
  const fetchChartData = async (selectedTenor: '7d' | '30d' | '60d' | '90d') => {
    setIsChartLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/index/history?period=${selectedTenor}`);
      const json = await response.json();

      if (json.status === 'ok' && json.data) {
        setChartData(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      setChartData([]);
    } finally {
      setIsChartLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchVixData();
    fetchChartData(tenor);
  }, []);

  // Auto-refresh VIX data every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchVixData, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch chart data when tenor changes
  useEffect(() => {
    fetchChartData(tenor);
  }, [tenor]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading CryptoVIX data...</p>
      </div>
    );
  }

  if (!vixData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Failed to load CryptoVIX data</p>
      </div>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-emerald-400 bg-emerald-400/10';
    if (confidence >= 70) return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header with navigation */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-emerald-400 mb-2">CryptoVIX</h1>
            <p className="text-zinc-400">Bitcoin options implied volatility index</p>
          </div>
          <nav className="space-x-4">
            <Link href="/methodology" className="text-zinc-400 hover:text-emerald-400 transition">
              Methodology
            </Link>
            <Link href="/status" className="text-zinc-400 hover:text-emerald-400 transition">
              Status
            </Link>
          </nav>
        </div>

        {/* Main gauge */}
        <div className="mb-8">
          <VixGauge
            value={vixData.value}
            change24h={vixData.change24h}
            changePercent24h={vixData.changePercent24h}
          />
        </div>

        {/* Confidence badge and venue info */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded border border-zinc-800 ${getConfidenceColor(vixData.confidence)}`}>
            <div className="text-sm font-semibold">Confidence</div>
            <div className="text-2xl font-bold">{vixData.confidence}%</div>
          </div>
          <div className="p-4 rounded border border-zinc-800 bg-zinc-900">
            <div className="text-sm font-semibold text-zinc-400">Venues Used</div>
            <div className="text-sm space-x-2">
              {(vixData.venuesUsed ?? []).map((venue) => (
                <span key={venue} className="inline-block px-2 py-1 rounded bg-emerald-400/20 text-emerald-400 capitalize">
                  {venue}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mb-8">
          <StatsBar
            btcPrice={vixData.metadata.btcPrice}
            lastUpdated={vixData.lastUpdated}
          />
        </div>

        {/* Tenor selector and chart */}
        <div className="mb-8">
          <div className="mb-4 flex gap-2">
            {['7d', '30d', '60d', '90d'].map((t) => (
              <button
                key={t}
                onClick={() => setTenor(t as '7d' | '30d' | '60d' | '90d')}
                className={`px-4 py-2 rounded border transition ${
                  tenor === t
                    ? 'border-emerald-400 bg-emerald-400/20 text-emerald-400'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <VixChart data={chartData} isLoading={isChartLoading} tenor={tenor} />
        </div>

        {/* Components breakdown */}
        <div>
          <ComponentBreakdown
            deribitIv={vixData.components.deribitIv}
            bybitIv={vixData.components.bybitIv}
          />
        </div>
      </div>
    </div>
  );
}
