import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SmartDataGrid — Browser-Native AI Data Filtering',
  description:
    'WebGPU-accelerated, on-device AI data grid. Natural language queries, zero server, zero cost, 100% private.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
