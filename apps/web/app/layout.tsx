import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CryptoVIX',
  description: 'Bitcoin options implied volatility index',
  keywords: ['Bitcoin', 'volatility', 'IV', 'options', 'crypto', 'index'],
  openGraph: {
    title: 'CryptoVIX',
    description: 'Bitcoin options implied volatility index',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CryptoVIX - Bitcoin Options Implied Volatility Index',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CryptoVIX',
    description: 'Bitcoin options implied volatility index',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
