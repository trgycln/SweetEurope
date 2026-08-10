// src/app/[locale]/login/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient + locale redirects)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import LoginForm from '@/components/LoginForm'; // Client-Komponente
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export default async function LoginPage({ params }: { params: Promise<{ locale: Locale }> }) {
    noStore(); // Caching deaktivieren, um Session-Status immer neu zu prüfen
    const { locale } = await params; // Locale holen

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const dictionary = await getDictionary(locale);

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt

    // Wenn der Benutzer bereits eingeloggt ist, zum entsprechenden Dashboard weiterleiten
    if (user) {
        const { data: profile } = await supabase.from('profiller').select('rol, tercih_edilen_dil').eq('id', user.id).single();
        
        const validLocales = ['de', 'en', 'tr', 'ar']; // Match with locales in i18n-config
        const targetLocale = (profile?.tercih_edilen_dil && validLocales.includes(profile.tercih_edilen_dil)) 
            ? profile.tercih_edilen_dil 
            : locale;
        
        // --- KORREKTUR: Redirects müssen sprachspezifisch sein ---
        if (profile?.rol === 'Yönetici' || profile?.rol === 'Personel' || profile?.rol === 'Ekip Üyesi') {
            redirect(`/${targetLocale}/admin/dashboard`); // targetLocale hinzugefügt
        } else {
            // Standard-Fallback für Müşteri/Alt Bayi
            redirect(`/${targetLocale}/portal/dashboard`); // targetLocale hinzugefügt
        }
        // --- ENDE KORREKTUR ---
    }
    
    // Benutzer ist nicht eingeloggt, Login-Formular anzeigen
    return <LoginForm dictionary={dictionary} locale={locale} />;
}