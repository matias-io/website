import { notFound } from 'next/navigation';
import en from '@/content/en.json';
import { ExperienceDetail } from '@/features/portfolio/detail-view';
import { createPageMetadata } from '@/features/seo/metadata';
import { breadcrumbStructuredData, JsonLd } from '@/features/seo/structured-data';
export const dynamicParams = false;
export function generateStaticParams() {
  return en.experiences.map((item) => ({ id: item.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = en.experiences.find((item) => item.id === id);
  return createPageMetadata({
    title: item ? `${item.role} at ${item.organization}` : 'Experience',
    description: item?.summary ?? 'Professional experience by Matias Suxo.',
    path: `/experience/${id}/`,
  });
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = en.experiences.find((experience) => experience.id === id);
  if (!item) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbStructuredData([
          { name: 'Home', path: '/' },
          { name: 'Experience', path: '/experience/' },
          { name: item.organization, path: `/experience/${item.id}/` },
        ])}
      />
      <ExperienceDetail id={item.id} />
    </>
  );
}
