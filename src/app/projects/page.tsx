import type { Metadata } from 'next';
import { ProjectIndex } from '@/features/portfolio/detail-view';
export const metadata: Metadata = { title: 'Projects' };
export default function Page() {
  return <ProjectIndex />;
}
