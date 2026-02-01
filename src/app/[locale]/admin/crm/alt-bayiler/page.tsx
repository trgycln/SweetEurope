import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';

interface AltBayilerPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AltBayilerPage({ params, searchParams }: AltBayilerPageProps) {
  const { locale } = await params;
  const resolved = searchParams ? await searchParams : {};
  const qs = new URLSearchParams();

  Object.entries(resolved).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, v));
    } else {
      qs.set(key, value);
    }
  });

  qs.set('ticari_tip', 'alt_bayi');

  redirect(`/${locale}/admin/crm/firmalar?${qs.toString()}`);
}
