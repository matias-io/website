import type { Metadata } from 'next';
import { ExperienceIndex } from '@/features/portfolio/detail-view';
export const metadata: Metadata = { title: 'Experience' };
export default function Page() {
  return <ExperienceIndex />;
}
