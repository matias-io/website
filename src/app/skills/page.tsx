import { SkillsPage } from '@/features/portfolio/detail-view';
import { createPageMetadata } from '@/features/seo/metadata';
import { breadcrumbStructuredData, JsonLd } from '@/features/seo/structured-data';

export const metadata = createPageMetadata({
  title: 'Skills',
  description: 'AI, software, embedded systems, and design skills by Matias Suxo.',
  path: '/skills/',
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbStructuredData([
          { name: 'Home', path: '/' },
          { name: 'Skills', path: '/skills/' },
        ])}
      />
      <SkillsPage />
    </>
  );
}
