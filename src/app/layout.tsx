import type { Metadata } from 'next';
import { PortfolioProviders } from '@/features/portfolio/shell';
import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/zen-kaku-gothic-new/latin-300.css';
import '@fontsource/zen-kaku-gothic-new/latin-400.css';
import './globals.css';
import '@/features/contact/contact-form.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://matiass.ca'),
  title: { default: 'Matias Suxo | AI & software development', template: '%s | Matias Suxo' },
  description:
    'AI platform developer at the University of Ottawa. Explore my work in AI assistants, retrieval, software engineering, and embedded systems.',
  icons: { icon: '/mark.svg' },
  openGraph: {
    title: 'Matias Suxo',
    description: 'AI, software, and the occasional circuit board.',
    type: 'website',
    locale: 'en_CA',
    url: 'https://matiass.ca',
    images: [
      {
        url: '/social.png',
        width: 1200,
        height: 630,
        alt: 'Matias Suxo, AI and software development',
      },
    ],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PortfolioProviders>{children}</PortfolioProviders>
      </body>
    </html>
  );
}
