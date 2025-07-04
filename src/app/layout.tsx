import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/providers/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Dev2QA',
  description: 'Universal Task Completion Certificate System by echobitstech',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body suppressHydrationWarning={true} className={`${inter.variable} font-body antialiased h-full`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
