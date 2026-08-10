// src/middleware.ts (Mit Logging)

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { canAccessAdminPath, normalizeAllowedAdminPanels } from '@/lib/admin/panel-access';

const locales = ['de', 'en', 'tr', 'ar'];
const defaultLocale = 'de';

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
        const { data: profile } = await supabase.from('profiller').select('rol, tercih_edilen_dil').eq('id', user.id).single();
        const userRole = profile?.rol;
        const redirectTo = (userRole === 'Yönetici' || userRole === 'Personel' || userRole === 'Ekip Üyesi')
            ? '/admin/dashboard'
            : '/portal/dashboard';
            
        let targetLocale = pathname.split('/')[1] || defaultLocale;
        if (profile?.tercih_edilen_dil && locales.includes(profile.tercih_edilen_dil)) {
            targetLocale = profile.tercih_edilen_dil;
        }
            
        console.log(`-> Middleware: Rolle ist '${userRole}'. Redirect zu /${targetLocale}${redirectTo}`);
        return NextResponse.redirect(new URL(`/${targetLocale}${redirectTo}`, req.url));
    }

    if (user && effectivePath.startsWith('/admin')) {
        const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).maybeSingle();
        const userRole = profile?.rol;
        const allowedPanels = normalizeAllowedAdminPanels(user.user_metadata?.allowed_admin_panels);

        if (!canAccessAdminPath(userRole, effectivePath, allowedPanels)) {
            const currentLocale = pathname.split('/')[1] || defaultLocale;
            console.log(`-> Middleware: Admin panel access denied for role '${userRole}' on '${effectivePath}'.`);
            return NextResponse.redirect(new URL(`/${currentLocale}/admin/dashboard`, req.url));
        }
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

    // Für eingeloggte Benutzer auf geschützten Routen: Aktuelle Locale mit bevorzugter Sprache erzwingen
    if (user && pathnameHasLocale && isProtectedRoute) {
        try {
            const { data: profile } = await supabase.from('profiller').select('tercih_edilen_dil').eq('id', user.id).single();
            const currentUrlLocale = pathname.split('/')[1];
            
            if (profile?.tercih_edilen_dil && locales.includes(profile.tercih_edilen_dil) && currentUrlLocale !== profile.tercih_edilen_dil) {
                // Nur das erste Vorkommen der Locale ersetzen, um Probleme bei z.B. /de/admin/de-stuff zu vermeiden
                const newPath = `/${profile.tercih_edilen_dil}${pathname.substring(currentUrlLocale.length + 1)}`;
                console.log(`-> Middleware: (Protected) Falsche Sprache (${currentUrlLocale}). Redirect zu ${newPath}`);
                const redirectUrl = new URL(newPath, req.url);
                redirectUrl.search = req.nextUrl.search; // Suchparameter beibehalten
                return NextResponse.redirect(redirectUrl);
            }
        } catch (error) {
            console.error("Fehler beim Abrufen der bevorzugten Sprache für Redirect:", error);
        }
    }

    // x-locale header: root layout html lang attribute icin (Dem Request hinzufügen!)
    const localeFromPath = pathname.split('/')[1];
    if (locales.includes(localeFromPath)) {
        res.headers.set('x-locale', localeFromPath); // Bleibt für Response (falls nützlich)
        req.headers.set('x-locale', localeFromPath); // WICHTIG: Setze es im Request für Server Components
    }

    console.log(`--- Middleware beendet für Pfad: ${pathname} ---`);
    
    // Wir müssen die aktualisierten Request-Header an Next.js weitergeben
    const finalRes = NextResponse.next({
        request: {
            headers: req.headers,
        }
    });

    // Cookies aus der Supabase-Antwort (res) in die finale Antwort übernehmen
    res.cookies.getAll().forEach(cookie => {
        finalRes.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return finalRes;
}

export const config = {
    matcher: [
        // Matcher schließt statische Dateien, Bilder und API-Routen aus.
        // Auth-Routen werden im Code oben behandelt.
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};