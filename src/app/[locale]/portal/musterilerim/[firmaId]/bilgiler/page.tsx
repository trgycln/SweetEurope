import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';

export default async function BilgilerRedirectPage({
    params
}: {
    params: Promise<{ firmaId: string; locale: Locale }>
}) {
    const { firmaId, locale } = await params;
    return redirect(`/${locale}/portal/musterilerim/${firmaId}/detaylar`);
}
