'use client';
import Link from 'next/link';
import { usePortfolio } from '@/i18n/provider';
export default function NotFound() {
  const { t } = usePortfolio();
  return (
    <article className="detail-article">
      <h2 className="detail-title">404</h2>
      <p>{t('missing')}</p>
      <Link href="/">{t('returnHome')}</Link>
    </article>
  );
}
