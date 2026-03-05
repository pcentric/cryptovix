'use client';

import { Bitcoin, Clock, ShieldCheck, Server } from 'lucide-react';

interface StatsBarProps {
  btcPrice: number;
  lastUpdated: string;
  confidence: number;
  venuesUsed: string[];
  stale?: boolean;
}

function getConfidenceLevel(confidence: number): { label: string; color: string } {
  if (confidence >= 90) return { label: 'High', color: 'text-emerald-400' };
  if (confidence >= 70) return { label: 'Medium', color: 'text-yellow-400' };
  return { label: 'Low', color: 'text-red-400' };
}

export function StatsBar({ btcPrice, lastUpdated, confidence, venuesUsed, stale }: StatsBarProps) {
  const confidenceLevel = getConfidenceLevel(confidence);
  const ALL_VENUES = ['deribit', 'bybit'];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    });
  };

  return (
    <div>
      {stale && (
        <div className="mb-3 px-3 py-2 rounded-md bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs">
          ⚠ Data may be stale — last update was more than 5 minutes ago
        </div>
      )}
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 border-t-2 border-t-emerald-500/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* BTC Price */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bitcoin className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-zinc-400">BTC Price</p>
            </div>
            <p className="text-xl font-bold tabular-nums text-emerald-400">
              ${btcPrice != null ? btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
            </p>
          </div>

          {/* Last Updated */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-zinc-400 animate-pulse-slow" />
              <p className="text-sm text-zinc-400">Last Updated</p>
            </div>
            <p className="text-sm font-semibold tabular-nums">{formatTime(lastUpdated)} UTC</p>
          </div>

          {/* Confidence */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              <p className="text-sm text-zinc-400">Confidence</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{confidence}%</p>
              <span className={`text-xs font-semibold ${confidenceLevel.color}`}>{confidenceLevel.label}</span>
            </div>
          </div>

          {/* Active Venues */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-zinc-400" />
              <p className="text-sm text-zinc-400">Active Venues</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_VENUES.map((venue) => {
                const isOnline = venuesUsed.includes(venue);
                return (
                  <span
                    key={venue}
                    className={`inline-block px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                      isOnline
                        ? 'bg-emerald-400/20 text-emerald-400'
                        : 'bg-red-400/20 text-red-400'
                    }`}
                  >
                    {venue} {isOnline ? '✓' : 'Offline'}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
