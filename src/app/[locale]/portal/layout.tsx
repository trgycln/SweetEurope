// app/[locale]/portal/layout.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PortalProvider } from '@/contexts/PortalContext';
import { PortalContainer } from '@/components/portal/PortalContainer';
import { Toaster } from 'sonner';
import { Database } from '@/lib/supabase/database.types';
import { getDictionary } from '@/dictionaries';
// HINWEIS: Annahme, dass Locale hier definiert ist. Falls nicht, 'de'|'en'|'tr'|'ar' verwenden.
import { Locale } from '@/i18n-config';

// Typ für die vom Server geladenen Profildaten
type ProfileWithFirma = Database['public']['Tables']['profiller']['Row'] & {
    firmalar: (Database['public']['Tables']['firmalar']['Row'] & {
        firmalar_finansal: Database['public']['Tables']['firmalar_finansal']['Row'][] | null;
    }) | null;
};

export default async function PortalLayout({ children, params }: { children: React.ReactNode; params: { locale: Locale } }) {
    const supabase = createSupabaseServerClient();
    const dictionary = await getDictionary(params.locale);

    // 1. Benutzerdaten abrufen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${params.locale}/login`);
    }

    // 2. Profil- und Benachrichtigungsdaten parallel laden
    const [profileData, notificationsData] = await Promise.all([
        supabase.from('profiller').select(`*, firmalar!profiller_firma_id_fkey (*, firmalar_finansal (*))`).eq('id', user.id).single(),
        supabase.from('bildirimler').select('*', { count: 'exact' }).eq('alici_id', user.id).order('created_at', { ascending: false }).limit(10)
    ]);

    const { data, error } = profileData;
    const profile = data as ProfileWithFirma | null;
    const firma = profile?.firmalar;

    if (error || !profile || !firma) {
        console.error("Portal-Zugriffsfehler (Layout):", { error });
        return redirect(`/${params.locale}/login?error=unauthorized`);
    }

    // 3. Anzahl der ungelesenen Benachrichtigungen ermitteln
    const { count: unreadCount } = await supabase
        .from('bildirimler')
        .select('*', { count: 'exact', head: true })
        .eq('alici_id', user.id)
        .eq('okundu_mu', false);

    // 4. Objekt mit den initialen Server-Daten für den Context erstellen
    //    Dieses Objekt enthält NUR die Daten, die vom Server kommen.
    //    Der Warenkorb-Status (`warenkorb`) und die Funktionen (`addToWarenkorb` etc.)
    //    werden innerhalb des `PortalProvider` mit `useState` erstellt.
    const initialContextValue = {
        profile,
        firma,
        initialNotifications: notificationsData.data || [],
        unreadNotificationCount: unreadCount ?? 0
    };

    return (
        // Der Provider erhält die initialen Server-Daten...
        <PortalProvider value={initialContextValue}>
            {/* ...und verwaltet den Warenkorb-Status intern. */}
            <PortalContainer dictionary={dictionary}>
                {children}
            </PortalContainer>
            <Toaster position="top-right" richColors />
        </PortalProvider>
    );
}
