import { createHomeMetadata } from '@/features/seo/metadata';
import { JsonLd, homeStructuredData } from '@/features/seo/structured-data';

export const metadata = createHomeMetadata();

export default function Home() {
  return <JsonLd data={homeStructuredData()} />;
}
