import { redirect } from 'next/navigation';

export default async function SablonYonetimPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  redirect('/' + locale + '/admin/urun-yonetimi/kategoriler');
}
