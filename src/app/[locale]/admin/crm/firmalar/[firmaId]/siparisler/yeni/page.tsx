import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import YeniSiparisFormu from "./YeniSiparisFormu";
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { Tables } from "@/lib/supabase/database.types";
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

type ProductOption = Pick<Tables<'urunler'>, 'id' | 'ad' | 'satis_fiyati_musteri'>;

interface YeniSiparisPageProps {
    params: Promise<{
        locale: Locale;
        firmaId?: string;
    }>;
    searchParams?: Promise<{
        firmaId?: string;
    }>;
}

export default async function YeniSiparisPage({ params, searchParams }: YeniSiparisPageProps) {
    const { locale, firmaId: paramFirmaId } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const firmaId = paramFirmaId || resolvedSearchParams?.firmaId;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        const redirectUrl = `/admin/operasyon/siparisler/yeni${firmaId ? `?firmaId=${firmaId}` : ''}`;
        return redirect(`/${locale}/login?next=${encodeURIComponent(redirectUrl)}`);
    }

    let firma: { unvan: string, adres: string | null } | null = null;
    let firmenListe: Pick<Tables<'firmalar'>, 'id' | 'unvan'>[] | null = null;

    if (firmaId) {
        const { data: fData, error: fError } = await supabase
            .from('firmalar')
            .select('unvan, adres')
            .eq('id', firmaId)
            .maybeSingle();

        if (fError || !fData) {
            notFound();
        }
        firma = fData;
    } else {
        const { data: fList } = await supabase
            .from('firmalar')
            .select('id, unvan')
            .not('status', 'eq', 'Pasif')
            .order('unvan');
        firmenListe = fList || [];
    }

    const { data: urunlerData, error: urunlerError } = await supabase
        .from('urunler')
        .select('id, ad, satis_fiyati_musteri')
        .eq('aktif', true)
        .order('created_at', { ascending: false });

    if (urunlerError) {
        console.error("Fehler beim Laden der Produkte:", urunlerError);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Fehler beim Laden der Produkte.</div>;
    }

    const urunler: ProductOption[] = urunlerData || [];

    return (
        <div className="space-y-6">
            <div>
                <Link
                    href={firmaId ? `/${locale}/admin/crm/firmalar/${firmaId}/siparisler` : `/${locale}/admin/operasyon/siparisler`}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors"
                >
                    <FiArrowLeft />
                    {firmaId ? 'Zurück zur Bestellliste der Firma' : 'Zurück zur Bestellübersicht'}
                </Link>
                <h1 className="font-serif text-4xl font-bold text-primary mt-2">Neue Bestellung erstellen</h1>
                {firma && (
                    <p className="text-gray-600 mt-1">Erstelle eine neue Bestellung für <span className="font-bold text-accent">{firma.unvan}</span>.</p>
                )}
                 {!firmaId && (
                     <p className="text-gray-600 mt-1">Wählen Sie eine Firma aus und fügen Sie Produkte hinzu.</p>
                 )}
            </div>

            <YeniSiparisFormu
                firmaId={firmaId || ''}
                firmenListe={firmenListe}
                varsayilanTeslimatAdresi={firma?.adres || ''}
                urunler={urunler}
                locale={locale}
            />
        </div>
    );
}