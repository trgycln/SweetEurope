import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';

export const dynamic = 'force-dynamic';

export default async function YeniSatisRedirectPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ firmaId?: string; musteriId?: string }>;
}) {
    const { locale } = await params;
    const { firmaId, musteriId } = await searchParams;
    const targetFirmaId = firmaId || musteriId;

    if (targetFirmaId) {
        return redirect(`/${locale}/portal/siparisler/yeni?firmaId=${targetFirmaId}`);
    }
    return redirect(`/${locale}/portal/siparisler/yeni`);
}
