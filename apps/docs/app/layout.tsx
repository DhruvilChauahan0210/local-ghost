import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Local Ghost — Browser-Native AI Components',
  description:
    'Local Ghost: WebGPU-powered AI components for React. Natural language filtering, form auto-fill, and charts — zero server, zero cost, 100% on-device.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var s = localStorage.getItem('lg-theme');
              var p = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
              document.documentElement.setAttribute('data-theme', s || p);
            } catch(e) {}
          })();
        `}} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
