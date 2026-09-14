import type { Metadata } from 'next';
import { ContactPage } from '@/features/portfolio/detail-view';
export const metadata: Metadata = { title: 'Contact' };
export default function Page() {
  return <ContactPage />;
}
