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

    // Schutz für Admin/Portal Routen
    const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/portal');
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
        // Die Locale-Ermittlung ist hier sehr einfach (immer 'de').
        // Sie könnten hier die 'getLocale'-Funktion verwenden, wenn sie komplexer wäre.
        const localeToAdd = defaultLocale;
        console.log(`-> Middleware: Locale fehlt für ${pathname}. Füge '${localeToAdd}' hinzu.`);
        return NextResponse.rewrite(
            new URL(`/${localeToAdd}${pathname.startsWith('/') ? '' : '/'}${pathname}`, req.url)
        );
    }

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