import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'QuantPulse | Institutional Investment Analytics & Backtesting Platform',
  description: 'Original modern investment analytics platform with multi-asset backtesting, MPT portfolio optimization, Monte Carlo simulations, and tactical strategy lab.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="bg-slate-950 text-slate-100 font-sans antialiased flex min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-[1600px] w-full mx-auto space-y-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}