import type { Metadata } from 'next';
import { SkillsPage } from '@/features/portfolio/detail-view';
export const metadata: Metadata = { title: 'Skills' };
export default function Page() {
  return <SkillsPage />;
}
