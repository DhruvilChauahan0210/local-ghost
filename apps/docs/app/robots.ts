import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow:     '/',
      },
    ],
    sitemap:  'https://local-ghost-docs.vercel.app/sitemap.xml',
    host:     'https://local-ghost-docs.vercel.app',
  };
}
