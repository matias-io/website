import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import en from '@/content/en.json';
import { ExperienceDetail } from '@/features/portfolio/detail-view';
export const dynamicParams = false;
export function generateStaticParams() {
  return en.experiences.map((item) => ({ id: item.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = en.experiences.find((item) => item.id === id);
  return {
    title: item ? `${item.role} at ${item.organization}` : 'Experience',
    description: item?.summary,
    alternates: { canonical: `/experience/${id}/` },
  };
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!en.experiences.some((item) => item.id === id)) notFound();
  return <ExperienceDetail id={id} />;
}
