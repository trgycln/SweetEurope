// src/middleware.ts (Mit Logging)

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const locales = ['de', 'en', 'tr', 'ar'];
const defaultLocale = 'de';

// Diese Funktion scheint nicht verwendet zu werden, aber wir lassen sie drin.
function getLocale(request: NextRequest): string {
    // Hier könnten Sie Logik hinzufügen, um die Locale aus Headern (Accept-Language)
    // oder Cookies zu lesen, falls gewünscht. Aktuell gibt sie immer 'de' zurück.
    return defaultLocale;
}

// Update function for handling cookies within middleware
async function updateSession(request: NextRequest) {
    console.log("--- updateSession gestartet ---"); // Log Start
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // Wichtig: In Middleware MUSS createServerClient OHNE await cookies()
    // verwendet werden, da die Cookies direkt vom 'request'-Objekt kommen.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // Wichtig: Request UND Response Cookies aktualisieren
                    request.cookies.set({ name, value, ...options });
                    response = NextResponse.next({ // Response neu erstellen, um aktualisierte Request-Cookies zu haben
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // Session aktualisieren
    try {
        const { data: { user }, error } = await supabase.auth.getUser(); // Session Refresh
        if (error) {
             console.error("Fehler in updateSession bei getUser:", error);
        } else {
             console.log("updateSession getUser erfolgreich:", user ? `User ID: ${user.id}` : "Kein User (Session Refresh)");
        }
    } catch (e) {
        console.error("Kritischer Fehler in updateSession bei getUser:", e);
    }

    console.log("--- updateSession beendet ---"); // Log Ende
    return response;
}


export async function middleware(req: NextRequest) {
    console.log(`--- Middleware gestartet für Pfad: ${req.nextUrl.pathname} ---`); // Log Start

    // Session aktualisieren und Response erhalten
    const res = await updateSession(req);
    const pathname = req.nextUrl.pathname;

    // Statische Dateien, API-Routen und Auth-Routen überspringen
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.includes('.') || // Prüft auf Dateiendungen wie .css, .js, .png etc.
        pathname.startsWith('/auth/') // Auth-Callback Routen etc.
       ) {
        console.log(`--- Middleware übersprungen (statisch/api/auth): ${pathname} ---`);
        return res; // Wichtig: 'res' (die Response von updateSession) zurückgeben, nicht 'NextResponse.next()'
    }

    // Supabase Client *nur zum Lesen* des Benutzers erstellen (nach updateSession)
    // Nutzt die aktualisierten Cookies aus 'req' (die von updateSession modifiziert wurden)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return req.cookies.get(name)?.value; },
                // set/remove sind hier nicht nötig
            },
        }
    );
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Middleware getUser nach updateSession:", user ? `User ID: ${user.id}` : "Kein User");

    // Geschützte Routen erkennen (auch mit Locale-Präfix)
    const pathSegments = pathname.split('/').filter(Boolean); // ['', 'de', 'admin', 'dashboard'] -> ['de','admin','dashboard']
    const possibleLocale = pathSegments[0];
    const hasLocalePrefix = locales.includes(possibleLocale);
    const effectivePath = hasLocalePrefix ? `/${pathSegments.slice(1).join('/')}` : pathname; // '/admin/dashboard'
    const isProtectedRoute = effectivePath.startsWith('/admin') || effectivePath.startsWith('/portal');
    if (!user && isProtectedRoute) {
        const requestedLocale = pathname.split('/')[1] || defaultLocale; // Locale aus Pfad holen oder Default
        console.log(`-> Middleware: Nicht eingeloggter Zugriff auf ${pathname}. Redirect zu /${requestedLocale}/login`);
        const loginUrl = new URL(`/${requestedLocale}/login`, req.url);
        loginUrl.searchParams.set('next', pathname); // Optional: Nach Login zurückleiten
        return NextResponse.redirect(loginUrl);
    }

    // Schutz für Login-Seite (wenn bereits eingeloggt) & Rollen-basierte Weiterleitung
    const isLoginPage = pathname.endsWith('/login'); // Prüft auf /de/login, /en/login etc.
    if (user && isLoginPage) {
        console.log(`-> Middleware: Eingeloggter Zugriff auf Login-Seite (${pathname}). Prüfe Rolle...`);
        const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
        const userRole = profile?.rol;
        const isInternalUser = userRole === 'Yönetici' || userRole === 'Ekip Üyesi';
        const redirectTo = isInternalUser ? '/admin/dashboard' : '/portal/dashboard';
        const currentLocale = pathname.split('/')[1] || defaultLocale;
        console.log(`-> Middleware: Rolle ist '${userRole}'. Redirect zu /${currentLocale}${redirectTo}`);
        return NextResponse.redirect(new URL(`/${currentLocale}${redirectTo}`, req.url));
    }

    // Hier könnte optional noch die Rollen-basierte Zugriffskontrolle eingefügt werden,
    // um z.B. 'Müşteri' am Zugriff auf '/admin/*' zu hindern, falls nötig.

    // --- i18n Logik (Locale-Präfix hinzufügen, wenn fehlt) ---
    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    // Wenn Locale fehlt, hinzufügen und neu schreiben
    if (!pathnameHasLocale) {
        // Regel:
        // - Geschützte Routen (/admin, /portal): Profil tercih edilen dil kullanılmaya çalışılır, yoksa defaultLocale
        // - Public Routen: Her zaman defaultLocale (de)
        let localeToAdd = defaultLocale;

        if (isProtectedRoute && user) {
            try {
                const { data: profile } = await supabase
                    .from('profiller')
                    .select('tercih_edilen_dil')
                    .eq('id', user.id)
                    .single();

                if (profile?.tercih_edilen_dil && locales.includes(profile.tercih_edilen_dil)) {
                    localeToAdd = profile.tercih_edilen_dil;
                    console.log(`-> Middleware: (Protected) Benutzer bevorzugte Sprache: ${localeToAdd}`);
                } else {
                    console.log(`-> Middleware: (Protected) Bevorzugte Sprache nicht gesetzt, defaultLocale verwendet: ${localeToAdd}`);
                }
            } catch (error) {
                console.error("Fehler beim Abrufen der bevorzugten Sprache (Protected Pfad):", error);
            }
        } else {
            // Public: immer defaultLocale
            console.log(`-> Middleware: (Public) Locale fehlt, defaultLocale verwendet: ${defaultLocale}`);
        }

        console.log(`-> Middleware: Locale fehlt für ${pathname}. Redirect zu '${localeToAdd}' hinzu.`);
        return NextResponse.redirect(
            new URL(`/${localeToAdd}${pathname.startsWith('/') ? '' : '/'}${pathname}`, req.url)
        );
    }

    // Für eingeloggte Benutzer: Prüfen, ob aktuelle Locale mit bevorzugter Sprache übereinstimmt
    // NEU: Nur auf geschützten Routen (/admin, /portal) erzwingen. Öffentliche Seiten dürfen Header-Auswahl behalten.
    if (user && pathnameHasLocale && isProtectedRoute) {
        const currentLocale = pathname.split('/')[1];
        console.log(`-> Middleware: Locale check - current: ${currentLocale}`);
        try {
            const { data: profile } = await supabase
                .from('profiller')
                .select('tercih_edilen_dil')
                .eq('id', user.id)
                .single();
            
            console.log(`-> Middleware: User preferred language from DB: ${profile?.tercih_edilen_dil}`);
            
            if (profile?.tercih_edilen_dil &&
                locales.includes(profile.tercih_edilen_dil) &&
                currentLocale !== profile.tercih_edilen_dil) {
                
                // Nur den Locale-Segment austauschen, Rest identisch lassen
                const remaining = pathSegments.slice(1).join('/'); // 'admin/dashboard' etc.
                const newPathname = `/${profile.tercih_edilen_dil}/${remaining}`;
                console.log(`-> Middleware: ✅ Language mismatch detected! Redirecting from ${pathname} to ${newPathname}`);
                return NextResponse.redirect(new URL(newPathname, req.url));
            } else {
                console.log(`-> Middleware: ℹ️ No redirect needed (current=${currentLocale}, preferred=${profile?.tercih_edilen_dil})`);
            }
        } catch (error) {
            console.error("-> Middleware: ❌ Fehler beim Prüfen der bevorzugten Sprache:", error);
        }
    }
    // Öffentliche Routen (nicht protected): Keine erzwungene Umschaltung auf Profil-Locale.
    // Header-Auswahl (manueller Wechsel) bleibt wirksam, weil wir hier keine Redirects mehr auslösen.

    console.log(`--- Middleware beendet für Pfad: ${pathname} ---`);
    // Wichtig: Immer 'res' (die Response von updateSession) zurückgeben, wenn keine andere Aktion erfolgt
    return res;
}

export const config = {
    matcher: [
        // Matcher schließt statische Dateien, Bilder und API-Routen aus.
        // Auth-Routen werden im Code oben behandelt.
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};