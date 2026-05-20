import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SmartDataGrid — Browser-Native AI Data Filtering',
  description:
    'WebGPU-accelerated, on-device AI data grid with natural language queries. Zero server latency, zero infrastructure cost, 100% privacy.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#0f1117',
          color: '#e2e8f0',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        {children}
      </body>
    </html>
  );
}
