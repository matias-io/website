import { ProjectIndex } from '@/features/portfolio/detail-view';
import { createPageMetadata } from '@/features/seo/metadata';
import { breadcrumbStructuredData, JsonLd } from '@/features/seo/structured-data';

export const metadata = createPageMetadata({
  title: 'Projects',
  description: 'Selected AI, software, hardware, and design projects by Matias Suxo.',
  path: '/projects/',
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbStructuredData([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects/' },
        ])}
      />
      <ProjectIndex />
    </>
  );
}
