import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-xl text-zinc-300 mb-2">Page not found</p>
        <p className="text-zinc-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 rounded-md bg-emerald-400 text-zinc-950 font-semibold hover:bg-emerald-300 transition"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
