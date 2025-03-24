'use client';
import './globals.css';
import { BetterStackWebVitals } from '@logtail/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <BetterStackWebVitals />
      <body>{children}</body>
    </html>
  );
}
