// src/app/[locale]/portal/layout.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PortalProvider } from '@/contexts/PortalContext';
import { PortalContainer } from '@/components/portal/PortalContainer';
import { Toaster } from 'sonner';
import { Database, Tables } from '@/lib/supabase/database.types';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

// Typen
type ProfileWithFirma = Tables<'profiller'> & {
    firmalar: (Tables<'firmalar'> & {
        firmalar_finansal: Tables<'firmalar_finansal'> | null; // Angepasst an Ihre DB (Objekt oder null)
    }) | null;
};
type Bildirim = Tables<'bildirimler'>;

export default async function PortalLayout({
    children,
    params
}: {
    children: React.ReactNode;
    // Next.js 15: params as Promise and await
    params: Promise<{ locale: Locale }>
}) {
    noStore(); // Caching deaktivieren
    const { locale } = await params;

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const dictionary = await getDictionary(locale);

    // 1. Benutzerdaten abrufen
    const { data: { user }, error: userError } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (userError || !user) {
        console.error("Fehler beim Abrufen des Benutzers (Portal-Layout):", userError);
        return redirect(`/${locale}/login`);
    }

    // 2. NUR das Profil laden
    const { data: profile, error: profileError } = await supabase
        .from('profiller')
        .select('*') // Alle Spalten des Profils
        .eq('id', user.id)
        .single();

    // Fehlerprüfung für Profil
    if (profileError || !profile) {
        console.error("Fehler beim Laden des Profils oder Profil nicht gefunden (Portal-Layout):", profileError);
        return redirect(`/${locale}/login?error=profile_not_found_or_error`);
    }

    // Sicherstellen, dass nur Portal-Rollen zugreifen
    if (profile.rol !== 'Müşteri' && profile.rol !== 'Alt Bayi') {
         console.warn(`Unberechtigter Zugriff auf Portal Layout durch Rolle: ${profile.rol}`);
         // Yönetici, Ekip Üyesi, and Personel should use admin area
         if (profile.rol === 'Personel') {
             return redirect(`/${locale}/admin/operasyon/siparisler`);
         }
         if (profile.rol === 'Yönetici' || profile.rol === 'Ekip Üyesi') {
             return redirect(`/${locale}/admin/dashboard`);
         }
         return redirect(`/${locale}/login?error=invalid_role`);
    }

    // Prüfen, ob eine firma_id vorhanden ist
    if (!profile.firma_id) {
        console.error("Benutzerprofil hat keine zugeordnete firma_id (Portal-Layout):", user.id);
        return redirect(`/${locale}/login?error=company_not_assigned`);
    }

    // 3. Firma separat laden (NUR wenn Profil und firma_id vorhanden sind)
    const { data: firma, error: firmaError } = await supabase
        .from('firmalar')
        .select('*, firmalar_finansal(*)') // Firma und Finanzdaten laden
        .eq('id', profile.firma_id)
        .single(); // single(), da Firma existieren MUSS

    // Fehlerprüfung für Firma
    if (firmaError || !firma) {
        console.error("Fehler beim Laden der Firma oder Firma nicht gefunden (Portal-Layout):", firmaError);
        // Mögliche Ursache: RLS auf 'firmalar' verhindert Zugriff?
        return redirect(`/${locale}/login?error=company_load_failed`);
    }
    // --- ENDE GEÄNDERTE ABFRAGELOGIK ---


    // 4. Benachrichtigungen parallel laden
    const [notificationsRes, unreadCountRes] = await Promise.all([
        supabase
            .from('bildirimler')
            .select('*')
            .eq('alici_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
        supabase
            .from('bildirimler')
            .select('*', { count: 'exact', head: true })
            .eq('alici_id', user.id)
            .eq('okundu_mu', false)
    ]);

    // Benachrichtigungsdaten verarbeiten (mit Fehlerbehandlung)
    const initialNotifications: Bildirim[] = notificationsRes.data || [];
    let unreadNotificationCount: number = 0;

    if (notificationsRes.error) {
        console.error("Fehler beim Laden der Benachrichtigungen (Portal-Layout):", notificationsRes.error);
    }
    if (unreadCountRes.error) {
        console.error("Fehler beim Zählen der ungelesenen Benachrichtigungen (Portal-Layout):", unreadCountRes.error);
    } else {
        unreadNotificationCount = unreadCountRes.count ?? 0;
    }


    // Initialer Wert für den Context
    const initialContextValue = {
        profile, // Das geladene Profil
        firma,   // Die separat geladene Firma
        initialNotifications,
        unreadNotificationCount
    };

    return (
        <PortalProvider value={initialContextValue}>
            <PortalContainer dictionary={dictionary} locale={locale}>
                {children}
            </PortalContainer>
            <Toaster position="top-right" richColors />
        </PortalProvider>
    );
}