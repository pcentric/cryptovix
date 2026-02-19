'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VixGaugeProps {
  value: number;
  change24h: number | null;
  changePercent24h: number | null;
}

type Regime = 'LOW' | 'MODERATE' | 'HIGH';

function getRegime(value: number): Regime {
  if (value < 30) return 'LOW';
  if (value <= 50) return 'MODERATE';
  return 'HIGH';
}

function getRegimeStyles(regime: Regime) {
  const styles = {
    LOW: {
      borderColor: 'border-l-emerald-400',
      textColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-400/10 text-emerald-400',
      shadowClass: 'shadow-glow-emerald',
      ring: 'ring-emerald-400/20',
      description: 'Market is calm with lower volatility expectations',
    },
    MODERATE: {
      borderColor: 'border-l-yellow-400',
      textColor: 'text-yellow-400',
      badgeBg: 'bg-yellow-400/10 text-yellow-400',
      shadowClass: 'shadow-glow-yellow',
      ring: 'ring-yellow-400/20',
      description: 'Market is showing balanced volatility levels',
    },
    HIGH: {
      borderColor: 'border-l-red-400',
      textColor: 'text-red-400',
      badgeBg: 'bg-red-400/10 text-red-400',
      shadowClass: 'shadow-glow-red',
      ring: 'ring-red-400/20',
      description: 'Market is experiencing elevated volatility',
    },
  };
  return styles[regime];
}

export function VixGauge({ value, change24h, changePercent24h }: VixGaugeProps) {
  const regime = getRegime(value);
  const styles = getRegimeStyles(regime);

  const changeIcon =
    change24h === null || change24h === 0 ? (
      <Minus className="w-4 h-4" />
    ) : change24h > 0 ? (
      <TrendingUp className="w-4 h-4" />
    ) : (
      <TrendingDown className="w-4 h-4" />
    );

  const changeSign = change24h !== null && change24h > 0 ? '+' : '';

  return (
    <div
      className={`bg-zinc-900 rounded-lg p-8 border border-zinc-800 border-l-4 ${styles.borderColor} ring-1 ${styles.ring} ${styles.shadowClass}`}
    >
      <div>
        {/* Regime badge */}
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-6 ${styles.badgeBg}`}>
          {regime} VOLATILITY
        </div>

        {/* Main value with pulse animation */}
        <div className={`text-7xl tabular-nums font-bold ${styles.textColor} mb-4 animate-pulse-slow`}>
          {value != null ? value.toFixed(2) : '—'}
        </div>

        {/* 24h change row */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`flex items-center gap-1 ${styles.textColor}`}>{changeIcon}</div>
          <div className="text-sm">
            {change24h !== null ? (
              <span>
                {changeSign}
                {change24h.toFixed(2)} ({changePercent24h?.toFixed(1)}%)
              </span>
            ) : (
              '—'
            )}
          </div>
        </div>

        {/* Regime description */}
        <p className="text-sm text-zinc-400">{styles.description}</p>
      </div>
    </div>
  );
}
