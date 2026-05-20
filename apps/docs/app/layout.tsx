import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Local Ghost — Browser-Native AI Components',
  description:
    'Local Ghost: WebGPU-powered AI components for React. Natural language filtering, form auto-fill, and charts — zero server, zero cost, 100% on-device.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
