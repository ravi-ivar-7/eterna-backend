import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/lib/providers/WalletProvider';
export const metadata: Metadata = {
  title: 'Eterna - DEX Order Execution Engine',
  description: 'High-performance order execution with real-time DEX routing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
