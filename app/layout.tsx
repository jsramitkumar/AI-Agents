import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import SessionProvider from '@/components/providers/SessionProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WP Cloud — Managed WordPress Hosting',
  description: 'Spin up isolated WordPress instances in seconds.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
