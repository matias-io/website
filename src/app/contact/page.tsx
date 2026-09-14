import { ContactPage } from '@/features/portfolio/detail-view';
import { createPageMetadata } from '@/features/seo/metadata';
import { breadcrumbStructuredData, JsonLd } from '@/features/seo/structured-data';

export const metadata = createPageMetadata({
  title: 'Contact',
  description: 'Contact Matias Suxo in Ottawa about AI, software, and creative technology work.',
  path: '/contact/',
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbStructuredData([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact/' },
        ])}
      />
      <ContactPage />
    </>
  );
}
