import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url:             'https://local-ghost-docs.vercel.app',
      lastModified:     new Date(),
      changeFrequency: 'weekly',
      priority:         1,
    },
    {
      url:             'https://local-ghost-docs.vercel.app/#components',
      lastModified:     new Date(),
      changeFrequency: 'monthly',
      priority:         0.9,
    },
    {
      url:             'https://local-ghost-docs.vercel.app/#install',
      lastModified:     new Date(),
      changeFrequency: 'monthly',
      priority:         0.9,
    },
    {
      url:             'https://local-ghost-docs.vercel.app/#analytics',
      lastModified:     new Date(),
      changeFrequency: 'monthly',
      priority:         0.8,
    },
    {
      url:             'https://local-ghost-docs.vercel.app/#architecture',
      lastModified:     new Date(),
      changeFrequency: 'monthly',
      priority:         0.7,
    },
  ];
}
