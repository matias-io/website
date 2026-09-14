import type { MetadataRoute } from 'next';
import content from '@/content/en.json';
import { absoluteUrl } from '@/features/seo/metadata';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '/',
    '/projects/',
    '/experience/',
    '/skills/',
    '/contact/',
    ...content.projects.map((p) => `/projects/${p.id}/`),
    ...content.experiences.map((e) => `/experience/${e.id}/`),
  ].map((path) => ({ url: absoluteUrl(path) }));
}
