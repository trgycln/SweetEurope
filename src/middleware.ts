import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const locales = ['de', 'en', 'tr', 'ar'];
const defaultLocale = 'de';

function getLocale(request: NextRequest): string {
    return defaultLocale;
}

// Update function for handling cookies within middleware
async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is set, update the request cookies.
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // Set the cookie on the response.
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the request cookies.
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // Remove the cookie from the response.
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // IMPORTANT: refreshing the session is crucial for Auth Helpers to work correctly
  await supabase.auth.getUser()

  return response
}


export async function middleware(req: NextRequest) {
    // Zuerst die Session aktualisieren (wichtig für Auth Helpers)
    const res = await updateSession(req);
    const pathname = req.nextUrl.pathname;

    // --- Unverändert: Statische Dateien und API-Routen überspringen ---
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.includes('.') ||
        pathname.startsWith('/auth/') // Auth-Routen nicht erneut prüfen
       ) {
        return res;
    }

    // --- Supabase Auth Logik (leicht angepasst) ---
    // Erstelle den Client *erneut*, aber diesmal nur zum Lesen der (jetzt aktuellen) User-Daten
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) { return req.cookies.get(name)?.value },
            // set/remove sind hier nicht unbedingt nötig, da updateSession sie schon behandelt hat
          },
        }
    );
    const { data: { user } } = await supabase.auth.getUser();

    // -- Schutz für Admin/Portal Routen --
    if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/portal'))) {
        // Leite zur sprachspezifischen Login-Seite weiter
        const locale = pathname.split('/')[1] || defaultLocale; // Locale aus Pfad holen
        const loginUrl = new URL(`/${locale}/login`, req.url);
        loginUrl.searchParams.set('next', pathname); // Optional: Nach Login zurückleiten
        return NextResponse.redirect(loginUrl);
    }

    // -- Schutz für Login-Seite (wenn bereits eingeloggt) & Rollen-basierte Weiterleitung --
    if (user) {
        if (pathname.endsWith('/login')) { // '/de/login', '/en/login' etc.
             const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
             const userRole = profile?.rol;
             const isInternalUser = userRole === 'Yönetici' || userRole === 'Ekip Üyesi';
             const redirectTo = isInternalUser ? '/admin/dashboard' : '/portal/dashboard';
             const locale = pathname.split('/')[1] || defaultLocale;
             return NextResponse.redirect(new URL(`/${locale}${redirectTo}`, req.url));
        }

        // -- Rollen-basierte Zugriffskontrolle (optional, aber gut) --
        // (Dein Code hier war schon korrekt, aber wir fügen Locale hinzu)
        // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
        // const userRole = profile?.rol;
        // const isInternalUser = userRole === 'Yönetici' || userRole === 'Ekip Üyesi';
        // const isExternalUser = userRole === 'Müşteri' || userRole === 'Alt Bayi';
        // const locale = pathname.split('/')[1] || defaultLocale;
        // if (isInternalUser && pathname.startsWith(`/${locale}/portal`)) {
        //     return NextResponse.redirect(new URL(`/${locale}/admin/dashboard`, req.url));
        // }
        // if (isExternalUser && pathname.startsWith(`/${locale}/admin`)) {
        //     return NextResponse.redirect(new URL(`/${locale}/portal/dashboard`, req.url));
        // }
    }
    // --- Supabase Auth Logik Ende ---


    // --- i18n Logik (Unverändert) ---
    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (pathnameHasLocale) return res;

    const locale = getLocale(req);
    return NextResponse.rewrite(
        new URL(`/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, req.url)
    );
}

export const config = {
    matcher: [
        // Matcher angepasst, um Auth-Routen explizit auszuschließen
        '/((?!api|_next/static|_next/image|favicon.ico|auth/).*)',
    ],
};