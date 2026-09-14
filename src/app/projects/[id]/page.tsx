import { notFound } from 'next/navigation';
import en from '@/content/en.json';
import { ProjectDetail } from '@/features/portfolio/detail-view';
import { createPageMetadata } from '@/features/seo/metadata';
import {
  breadcrumbStructuredData,
  JsonLd,
  projectStructuredData,
} from '@/features/seo/structured-data';
export const dynamicParams = false;
export function generateStaticParams() {
  return en.projects.map((project) => ({ id: project.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = en.projects.find((project) => project.id === id);
  return createPageMetadata({
    title: project?.title ?? 'Project',
    description: project?.summary ?? 'Project details by Matias Suxo.',
    path: `/projects/${id}/`,
    image: project?.image,
    imageAlt: project?.title,
  });
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = en.projects.find((item) => item.id === id);
  if (!project) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbStructuredData([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects/' },
          { name: project.title, path: `/projects/${project.id}/` },
        ])}
      />
      <JsonLd data={projectStructuredData(project)} />
      <ProjectDetail id={project.id} />
    </>
  );
}
