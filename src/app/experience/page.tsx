import { ExperienceIndex } from '@/features/portfolio/detail-view';
import { createPageMetadata } from '@/features/seo/metadata';
import { breadcrumbStructuredData, JsonLd } from '@/features/seo/structured-data';

export const metadata = createPageMetadata({
  title: 'Experience',
  description:
    'AI platform development, software engineering, embedded work, and leadership experience.',
  path: '/experience/',
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbStructuredData([
          { name: 'Home', path: '/' },
          { name: 'Experience', path: '/experience/' },
        ])}
      />
      <ExperienceIndex />
    </>
  );
}
