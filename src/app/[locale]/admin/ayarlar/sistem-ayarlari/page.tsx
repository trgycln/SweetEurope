import { redirect } from 'next/navigation';

export default async function SystemSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/urun-yonetimi/fiyatlandirma-hub`);
}