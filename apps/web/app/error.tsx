'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
        <p className="text-zinc-400 mb-6">
          An unexpected error occurred while loading this page. Please try again or contact support if the problem persists.
        </p>
        {error.message && (
          <p className="text-xs text-zinc-500 mb-6 bg-zinc-900 rounded-lg p-3 font-mono">
            {error.message}
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 rounded-md bg-emerald-400 text-zinc-950 font-semibold hover:bg-emerald-300 transition"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-6 py-2 rounded-md border border-zinc-700 text-zinc-400 font-semibold hover:border-zinc-600 hover:text-zinc-200 transition"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
