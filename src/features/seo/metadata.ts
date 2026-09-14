import type { Metadata } from 'next';

export const SITE_URL = 'https://matiass.ca';
export const SITE_NAME = 'Matias Suxo';
export const SITE_DESCRIPTION =
  'AI platform developer at the University of Ottawa. Explore work in AI assistants, retrieval, software engineering, and embedded systems.';
export const SOCIAL_IMAGE = '/social.png';

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
}

export function createPageMetadata({
  title,
  description,
  path,
  image = SOCIAL_IMAGE,
  imageAlt = `${SITE_NAME}, ${title}`,
}: PageMetadataOptions): Metadata {
  const url = absoluteUrl(path);
  const shareTitle = `${title} | ${SITE_NAME}`;
  const imageUrl = absoluteUrl(image);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: shareTitle,
      description,
      siteName: SITE_NAME,
      locale: 'en_CA',
      images: [{ url: imageUrl, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description,
      images: [imageUrl],
    },
  };
}

export function createHomeMetadata(): Metadata {
  const metadata = createPageMetadata({
    title: 'AI & software development',
    description: SITE_DESCRIPTION,
    path: '/',
    imageAlt: 'Matias Suxo, AI and software development',
  });
  return { ...metadata, title: { absolute: `${SITE_NAME} | AI & software development` } };
}
