import type { Metadata } from 'next';
import './globals.css';

const SITE_URL = 'https://local-ghost-docs.vercel.app';
const TITLE    = 'Local Ghost — AI React Components That Run in the Browser';
const DESC     = 'Add AI to any React app without API keys, servers, or costs. Local Ghost uses WebGPU to run natural language queries, form auto-fill, and chart generation 100% in the browser. Free, private, zero latency.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default:  TITLE,
    template: '%s | Local Ghost',
  },

  description: DESC,

  keywords: [
    'React AI components',
    'WebGPU React',
    'browser AI no API key',
    'local AI React library',
    'on-device AI web app',
    'natural language filter table React',
    'AI form autofill React',
    'AI chart generator React',
    'zero cost AI React',
    'private AI React no server',
    'WebGPU machine learning browser',
    'run AI in browser',
    'SmartDataGrid React',
    'SmartForm AI',
    'SmartAnalytics React',
    'free AI React components npm',
    'no OpenAI React',
    'client-side AI components',
    'Qwen WebGPU React',
    'browser native AI components',
  ],

  authors:  [{ name: 'Dhruvil Chauahan', url: 'https://github.com/DhruvilChauahan0210' }],
  creator:  'Dhruvil Chauahan',
  publisher:'Dhruvil Chauahan',

  robots: {
    index:          true,
    follow:         true,
    googleBot: {
      index:              true,
      follow:             true,
      'max-image-preview':'large',
      'max-snippet':      -1,
    },
  },

  alternates: {
    canonical: SITE_URL,
  },

  openGraph: {
    type:        'website',
    url:          SITE_URL,
    siteName:    'Local Ghost',
    title:        TITLE,
    description:  DESC,
    // No images array — Next.js auto-discovers app/opengraph-image.tsx
  },

  twitter: {
    card:        'summary_large_image',
    title:        TITLE,
    description:  DESC,
    // No images array — Next.js auto-discovers app/opengraph-image.tsx
    creator:     '@DhruvilChauahan',
  },

  icons: {
    icon:        '/icon.svg',
    shortcut:    '/icon.svg',
    apple:       '/icon.svg',
  },

  category: 'technology',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type':            'SoftwareApplication',
      name:               'Local Ghost',
      alternateName:      '@dhruvil0210/local-ghost',
      applicationCategory:'DeveloperApplication',
      operatingSystem:    'Web Browser',
      url:                 SITE_URL,
      downloadUrl:        'https://www.npmjs.com/package/@dhruvil0210/local-ghost',
      softwareVersion:    '1.2.2',
      releaseNotes:       `${SITE_URL}/#changelog`,
      description:         DESC,
      offers: {
        '@type': 'Offer',
        price:   '0',
        priceCurrency: 'USD',
      },
      author: {
        '@type': 'Person',
        name:    'Dhruvil Chauahan',
        url:     'https://github.com/DhruvilChauahan0210',
      },
      license:       'https://opensource.org/licenses/MIT',
      codeRepository:'https://github.com/DhruvilChauahan0210/local-ghost',
      keywords:      'React, AI, WebGPU, browser, no API key, natural language, components',
      featureList: [
        'Natural language data filtering',
        'AI-powered form auto-fill from unstructured text',
        'Natural language chart generation',
        'Runs 100% in the browser via WebGPU',
        'No API keys or server required',
        'Zero cost per query',
        'Complete data privacy',
        'WebGPU with WASM fallback',
      ],
    },
    {
      '@type':      'WebSite',
      url:           SITE_URL,
      name:         'Local Ghost',
      description:   DESC,
      publisher: {
        '@type': 'Person',
        name:    'Dhruvil Chauahan',
      },
    },
    {
      '@type':        'BreadcrumbList',
      itemListElement:[
        { '@type':'ListItem', position:1, name:'Home',      item: SITE_URL },
        { '@type':'ListItem', position:2, name:'Live Demo', item:'https://local-ghost-demo.vercel.app' },
        { '@type':'ListItem', position:3, name:'npm',       item:'https://www.npmjs.com/package/@dhruvil0210/local-ghost' },
      ],
    },
  ],
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

        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
