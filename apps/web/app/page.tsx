'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';
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

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
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

        {/* Skeleton gauge */}
        <div className="mb-8 skeleton h-48 rounded-lg" />

        {/* Skeleton stats bar */}
        <div className="mb-8 skeleton h-24 rounded-lg" />

        {/* Skeleton chart */}
        <div className="mb-8">
          <div className="mb-4 flex gap-2">
            {['7d', '30d', '60d', '90d'].map((t) => (
              <div key={t} className="skeleton w-16 h-10 rounded" />
            ))}
          </div>
          <div className="skeleton h-[380px] rounded-lg" />
        </div>

        {/* Skeleton breakdown */}
        <div className="skeleton h-56 rounded-lg" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [vixData, setVixData] = useState<VixIndexData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [tenor, setTenor] = useState<'7d' | '30d' | '60d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Fetch current VIX data
  const fetchVixData = async () => {
    try {
      setHasError(false);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/index`);
      const json = await response.json();

      if (json.status === 'ok' && json.data) {
        setVixData(json.data);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error('Failed to fetch VIX data:', error);
      setHasError(true);
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
    return <DashboardSkeleton />;
  }

  if (hasError || !vixData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-xl text-zinc-100 mb-2">Failed to load CryptoVIX data</p>
          <p className="text-sm text-zinc-400 mb-6">Please check your connection and try again</p>
          <button
            onClick={() => {
              setIsLoading(true);
              setHasError(false);
              fetchVixData();
            }}
            className="px-4 py-2 rounded-md bg-emerald-400 text-zinc-950 font-semibold hover:bg-emerald-300 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header with navigation */}
          <div className="flex justify-between items-start mb-8 animate-fade-in">
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
          <div className="mb-8 animate-fade-in">
            <VixGauge
              value={vixData.value}
              change24h={vixData.change24h}
              changePercent24h={vixData.changePercent24h}
            />
          </div>

          {/* Stats bar */}
          <div className="mb-8 animate-fade-in">
            <StatsBar
              btcPrice={vixData.metadata.btcPrice}
              lastUpdated={vixData.lastUpdated}
              confidence={vixData.confidence}
              venuesUsed={vixData.venuesUsed}
            />
          </div>

          {/* Tenor selector and chart */}
          <div className="mb-8 animate-fade-in">
            <div className="mb-4 flex gap-2">
              {['7d', '30d', '60d', '90d'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTenor(t as '7d' | '30d' | '60d' | '90d')}
                  className={`px-4 py-2 rounded-md border transition focus-visible:ring-2 ${
                    tenor === t
                      ? 'border-emerald-400 bg-emerald-400/20 text-emerald-400'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <VixChart data={chartData} isLoading={isChartLoading} tenor={tenor} />
          </div>

          {/* Components breakdown */}
          <div className="animate-fade-in">
            <ComponentBreakdown
              deribitIv={vixData.components.deribitIv}
              bybitIv={vixData.components.bybitIv}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/50 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-zinc-400">
          <p className="mb-4">
            CryptoVIX is a Bitcoin options implied volatility index aggregating data from leading derivatives venues.
            This data is provided for informational purposes and should not be considered financial advice.
          </p>
          <div className="flex gap-6">
            <Link href="/methodology" className="hover:text-emerald-400 transition">
              Methodology
            </Link>
            <Link href="/status" className="hover:text-emerald-400 transition">
              Status
            </Link>
            <a href="#" className="hover:text-emerald-400 transition">
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
