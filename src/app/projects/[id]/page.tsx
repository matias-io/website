import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import en from '@/content/en.json';
import { ProjectDetail } from '@/features/portfolio/detail-view';
export const dynamicParams = false;
export function generateStaticParams() {
  return en.projects.map((project) => ({ id: project.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = en.projects.find((project) => project.id === id);
  return {
    title: project?.title,
    description: project?.summary,
    alternates: { canonical: `/projects/${id}/` },
  };
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!en.projects.some((project) => project.id === id)) notFound();
  return <ProjectDetail id={id} />;
}
