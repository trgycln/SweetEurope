// src/app/[locale]/admin/layout.tsx
// KORRIGIERTE VERSION (await params, cookies, createClient + Robustere Fehlerbehandlung)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/AdminLayoutClient';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { cookies } from 'next/headers'; // Wichtig

// Typ für Benachrichtigungen
type Bildirim = Tables<'bildirimler'>;

export default async function AdminLayout({
    children,
    params, // Kommt hier als Promise an
}: {
    children: React.ReactNode;
    // Die Signatur MUSS Promise enthalten
    params: Promise<{ locale: Locale }>;
}) {
    // --- params auflösen ---
    const resolvedParams = await params;
    const locale = resolvedParams.locale;
    // --- ENDE ---

    // --- Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE ---

    // Benutzer abrufen
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        // Loggen Sie den spezifischen Fehler beim Abrufen des Benutzers
        console.error('Fehler beim Abrufen des Benutzers im Layout:', userError);
        // Ziehen Sie einen Redirect in Betracht, wenn der Benutzer nicht abgerufen werden kann
        // return redirect(`/${locale}/login?error=auth_error`);
    }

    if (!user) {
        // Wenn kein Benutzer vorhanden ist, zum Login weiterleiten
        console.log('Kein Benutzer im Layout gefunden, redirect zu Login.');
        return redirect(`/${locale}/login`);
    }

    // Profil und Benachrichtigungen parallel abrufen
    const [profileRes, notificationsRes, unreadCountRes] = await Promise.all([
        supabase
            .from('profiller')
            .select('rol, tercih_edilen_dil')
            .eq('id', user.id)
            .single(),
        supabase
            .from('bildirimler')
            .select('*')
            .eq('alici_id', user.id)
            .eq('okundu_mu', false)
            .order('created_at', { ascending: false })
            .limit(10),
        supabase
            .from('bildirimler')
            .select('*', { count: 'exact', head: true }) // Fordert nur den Count an
            .eq('alici_id', user.id)
            .eq('okundu_mu', false),
    ]);

    // Profil prüfen
    const profileData = profileRes.data;
    if (!profileData) {
        console.error('Kullanıcı profili bulunamadı für Benutzer:', user.id);
        // Zum Login weiterleiten, da das Profil essenziell ist
        return redirect(`/${locale}/login?error=profile_not_found`);
    }

    const userRole = profileData.rol as Enums<'user_role'> | null;

    // Dictionary laden
    const dictionary = await getDictionary(locale);

    // Berechtigungsprüfung für Admin-Bereich
    if (userRole !== 'Yönetici' && userRole !== 'Ekip Üyesi') {
        console.warn(`Unberechtigter Zugriff auf Admin Layout durch Rolle: ${userRole}`);
        // Zum entsprechenden Portal weiterleiten
        return redirect(`/${locale}/portal/dashboard`);
    }

    // Benachrichtigungsdaten vorbereiten mit Fehlerprüfung
    let initialNotifications: Bildirim[] = [];
    let unreadNotificationCount: number = 0;

    if (notificationsRes.error) {
         // Loggen Sie den spezifischen Fehler, auch wenn er leer ist
        console.error('Fehler beim Laden der Benachrichtigungen:', notificationsRes.error);
        // Optional: Zeigen Sie dem Benutzer eine Meldung oder verwenden Sie Standardwerte
    } else {
        initialNotifications = notificationsRes.data || [];
    }

    if (unreadCountRes.error) {
        // Loggen Sie den spezifischen Fehler, auch wenn er leer ist
        console.error('Fehler beim Zählen der Benachrichtigungen:', unreadCountRes.error);
        // Setzen Sie count auf 0 oder einen anderen Fallback-Wert
        unreadNotificationCount = 0;
    } else {
        // Verwenden Sie den count nur, wenn kein Fehler aufgetreten ist
        unreadNotificationCount = unreadCountRes.count ?? 0;
    }

    // Layout rendern
    return (
        <AdminLayoutClient
            user={user}
            userRole={userRole}
            dictionary={dictionary}
            initialNotifications={initialNotifications}
            initialUnreadCount={unreadNotificationCount} // Verwenden Sie den (potenziell 0) Wert
            locale={locale}
        >
            {children}
        </AdminLayoutClient>
    );
}