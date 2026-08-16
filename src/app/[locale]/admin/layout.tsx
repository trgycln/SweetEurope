// src/app/[locale]/admin/layout.tsx
// KORRIGIERTE VERSION (await params, cookies, createClient + Robustere Fehlerbehandlung)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/AdminLayoutClient';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { cookies } from 'next/headers'; // Wichtig
import { VisitPlannerProvider } from '@/contexts/VisitPlannerContext';
import VisitPlannerPanel from '@/components/VisitPlannerPanel';
import { normalizeAllowedAdminPanels } from '@/lib/admin/panel-access';
import { getGlobalCachedUser, getCachedProfile, getCachedUnreadNotificationsCount } from '@/lib/admin/cache-utils';

// Typ für Benachrichtigungen
type Bildirim = Tables<'bildirimler'>;

export default async function AdminLayout({
    children,
    params, // Kommt hier als Promise an
}: {
    children: React.ReactNode;
    // Die Signatur MUSS Promise enthalten
    params: Promise<{ locale: string }>;
}) {
    // --- params auflösen ---
    const resolvedParams = await params;
    const locale = resolvedParams.locale as Locale;
    // --- ENDE ---

    // --- Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE ---

    // Benutzer abrufen (Global Cached)
    const { data: { user }, error: userError } = await getGlobalCachedUser();

    if (userError) {
        console.error('Fehler beim Abrufen des Benutzers im Layout:', userError);
    }

    if (!user) {
        console.log('Kein Benutzer im Layout gefunden, redirect zu Login.');
        return redirect(`/${locale}/login`);
    }

    // Profil ve Bildirimler
    const { profile: profileData } = await getCachedProfile(supabase, user.id);
    const { count: unreadCount, error: unreadCountError } = await getCachedUnreadNotificationsCount(supabase, user.id);
    
    // Bildirim listesi (cached olmasina gerek yok, dinamik veya son eylemlere bagli, zaten 10 limitli)
    const { data: notificationsResData, error: notificationsError } = await supabase
        .from('bildirimler')
        .select('*')
        .eq('alici_id', user.id)
        .eq('okundu_mu', false)
        .order('created_at', { ascending: false })
        .limit(10);

    // Profil prüfen
    if (!profileData) {
        console.error('Kullanıcı profili bulunamadı für Benutzer:', user.id);
        return redirect(`/${locale}/login?error=profile_not_found`);
    }

    const userRole = profileData.rol as Enums<'user_role'> | null;
    const allowedPanels = normalizeAllowedAdminPanels(user.user_metadata?.allowed_admin_panels);

    // Dictionary laden
    const dictionary = await getDictionary(locale);

    // Berechtigungsprüfung für Admin-Bereich
    if (userRole !== 'Yönetici' && userRole !== 'Ekip Üyesi' && userRole !== 'Personel') {
        console.warn(`Unberechtigter Zugriff auf Admin Layout durch Rolle: ${userRole}`);
        // Zum entsprechenden Portal weiterleiten
        return redirect(`/${locale}/portal/dashboard`);
    }

    // Benachrichtigungsdaten vorbereiten mit Fehlerprüfung
    let initialNotifications: Bildirim[] = [];
    let unreadNotificationCount: number = 0;

    if (notificationsError) {
        console.error('Fehler beim Laden der Benachrichtigungen:', notificationsError);
    } else {
        initialNotifications = notificationsResData || [];
    }

    if (unreadCountError) {
        console.error('Fehler beim Zählen der Benachrichtigungen:', unreadCountError);
        unreadNotificationCount = 0;
    } else {
        unreadNotificationCount = unreadCount ?? 0;
    }

    // Layout rendern
    return (
        <VisitPlannerProvider>
            <AdminLayoutClient
                user={user}
                userRole={userRole}
                dictionary={dictionary}
                initialNotifications={initialNotifications}
                initialUnreadCount={unreadNotificationCount} // Verwenden Sie den (potenziell 0) Wert
                locale={locale}
                allowedPanels={allowedPanels}
            >
                {children}
            </AdminLayoutClient>
            <VisitPlannerPanel />
        </VisitPlannerProvider>
    );
}