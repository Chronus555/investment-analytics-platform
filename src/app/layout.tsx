import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

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
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
