import type { ReactNode } from 'react';
import type { Project } from '@/content/types';
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './metadata';

export type JsonLdObject = Record<string, unknown>;

export function JsonLd({ data }: { data: JsonLdObject }): ReactNode {
  const serialized = (JSON.stringify(data) ?? '')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialized }} />;
}

const personId = `${SITE_URL}/#person`;
const websiteId = `${SITE_URL}/#website`;

const person = {
  '@type': 'Person',
  '@id': personId,
  name: SITE_NAME,
  url: SITE_URL,
  image: absoluteUrl('/media/matias-studio.webp'),
  jobTitle: 'AI platform developer',
  description: 'AI platform developer at the University of Ottawa.',
  sameAs: [
    'https://matiass.ca/',
    'https://www.linkedin.com/in/matias-suxo/',
    'https://github.com/matias-io',
  ],
};

export function homeStructuredData(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { '@id': personId },
      },
      person,
      {
        '@type': 'ProfilePage',
        '@id': `${SITE_URL}/#profile`,
        url: SITE_URL,
        name: `${SITE_NAME} | AI & software development`,
        isPartOf: { '@id': websiteId },
        mainEntity: { '@id': personId },
      },
    ],
  };
}

export function projectStructuredData(project: Project): JsonLdObject {
  const url = absoluteUrl(`/projects/${project.id}/`);
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': url,
    url,
    name: project.title,
    description: project.summary,
    creator: { '@id': personId },
    isPartOf: { '@id': websiteId },
    ...(project.image ? { image: absoluteUrl(project.image) } : {}),
  };
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbStructuredData(items: readonly BreadcrumbItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
