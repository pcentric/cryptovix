import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'CryptoVIX',
  description: 'Bitcoin options implied volatility index',
  keywords: ['Bitcoin', 'volatility', 'IV', 'options', 'crypto', 'index'],
  openGraph: {
    title: 'CryptoVIX',
    description: 'Bitcoin options implied volatility index',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CryptoVIX',
    description: 'Bitcoin options implied volatility index',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className={`${inter.className} antialiased bg-zinc-950 text-zinc-100`}>{children}</body>
    </html>
  );
}
