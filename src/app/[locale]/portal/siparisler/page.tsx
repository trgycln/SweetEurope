import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Korrekter Import für SSR
import { cookies } from 'next/headers'; // Cookies importieren
import { notFound, redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { SiparislerClient } from '@/components/portal/siparisler/SiparislerClient';
import { Enums } from '@/lib/supabase/database.types';

const ORDERS_PER_PAGE = 20;
const OFFENE_STATUS: Enums<'siparis_durumu'>[] = ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing'];

// Definieren des Props-Typs außerhalb der Funktion
type PageProps = {
    params: { locale: Locale };
    searchParams: { [key: string]: string | string[] | undefined };
};

// Die Funktion muss async sein
export default async function PartnerSiparisListPage({ params, searchParams }: PageProps) {
    const locale = params.locale; // locale kann direkt verwendet werden
    const cookieStore = cookies(); // Cookies holen

    // Supabase Client korrekt initialisieren
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
            },
        }
    );

    // Dictionary und User holen (mit await)
    const dictionary = await getDictionary(locale);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error("Fehler beim Abrufen des Benutzers:", userError);
        return redirect(`/${locale}/login`);
    }

    // Profil holen (mit await)
    const { data: profile, error: profileError } = await supabase.from('profiller').select('firma_id').eq('id', user.id).single();

    if (profileError || !profile || !profile.firma_id) {
        console.error("Fehler beim Abrufen des Profils:", profileError);
        return notFound(); // Oder redirect zum Login mit Fehlermeldung
    }
    const firmaId = profile.firma_id;

    // SearchParams erst HIER sicher auslesen, NACHDEM async Operationen abgeschlossen sind
    const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;
    const status = typeof searchParams.status === 'string' ? searchParams.status as Enums<'siparis_durumu'> : undefined;
    const searchQuery = typeof searchParams.q === 'string' ? searchParams.q : undefined;
    const filterParam = typeof searchParams.filter === 'string' ? searchParams.filter : undefined;

    // Abfrage erstellen
    let query = supabase
        .from('siparisler')
        .select('id, siparis_tarihi, toplam_tutar_net, siparis_durumu', { count: 'exact' })
        .eq('firma_id', firmaId); // firmaId hier verwenden

    // Filter anwenden
    if (filterParam === 'offen') {
        query = query.in('siparis_durumu', OFFENE_STATUS);
    } else if (status) {
        const validStatuses = ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'Teslim Edildi', 'İptal Edildi', 'processing'];
        if (validStatuses.includes(status)) {
             query = query.eq('siparis_durumu', status);
        } else {
             console.warn(`Ungültiger Statusfilter erhalten: ${status}`);
        }
    }

    // ID-Suche mit Text-Casting
    if (searchQuery) {
        query = query.like('id::text', `${searchQuery}%`);
    }

    // Sortierung und Paginierung
    const from = (page - 1) * ORDERS_PER_PAGE;
    const to = from + ORDERS_PER_PAGE - 1;
    query = query.order('siparis_tarihi', { ascending: false }).range(from, to);

    // Abfrage ausführen (mit await)
    const { data: siparisler, error, count } = await query;

    if (error) {
        console.error("Partner siparişleri çekilirken hata:", error.message || error);
        // Hier könnte man den Fehler an eine Fehlerkomponente übergeben
        // return <ErrorMessage message={error.message} />;
    }

    const pageCount = count ? Math.ceil(count / ORDERS_PER_PAGE) : 0;

    // Daten an den Client übergeben
    return (
        <SiparislerClient
            initialSiparisler={siparisler || []}
            totalCount={count || 0}
            pageCount={pageCount}
            currentPage={page}
            dictionary={dictionary}
            locale={locale}
        />
    );
}