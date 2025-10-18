import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

// --- GET Funktion für Callback ---
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Leite nach erfolgreichem Login weiter (normalerweise zum Dashboard)
      // Beachte: 'next' kommt aus der URL, falls gesetzt.
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Leite bei Fehlern zur Fehlerseite weiter
  console.error("Auth Callback Error:", code);
  // Optional: Erstelle eine spezifische Fehlerseite
  // return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  // Oder leite einfach zur Login-Seite mit einem Fehlerparameter weiter
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}

// --- Explizite POST Funktion für SignOut ---
export async function POST(request: NextRequest) {
  // Überprüfen, ob der Pfad auf /auth/sign-out endet
  if (request.nextUrl.pathname.endsWith('/auth/sign-out')) {
      console.log("Handling POST /auth/sign-out explicitly via route handler"); // Log zur Überprüfung
      const cookieStore = cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) { return cookieStore.get(name)?.value },
            set(name: string, value: string, options) { cookieStore.set({ name, value, ...options }) },
            remove(name: string, options) { cookieStore.delete({ name, ...options }) },
          },
        }
      )

      // Führe den Logout durch
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Error signing out via route handler:', error)
         // Im Fehlerfall: JSON-Fehler zurückgeben
         return new NextResponse(JSON.stringify({ error: 'Sign out failed' }), { status: 500 });
      }

      // Erfolgreich abgemeldet, leite zur Login-Seite um.
      // Versuche, die Locale aus der URL zu extrahieren, oder setze 'de' als Standard.
      const urlParts = request.nextUrl.pathname.split('/');
      // Annahme: /auth/sign-out oder /de/auth/sign-out etc.
      const locale = urlParts.length > 2 && urlParts[1].length === 2 ? urlParts[1] : 'de';
      const redirectUrl = `${request.nextUrl.origin}/${locale}/login`;
      console.log("Redirecting after sign out (route handler) to:", redirectUrl);
      // WICHTIG: Verwende Status 303 (See Other) für Redirect nach POST, um Formular-Neusendung zu vermeiden
      return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  // Handle andere POST-Anfragen, falls nötig
  console.warn(`Unhandled POST request to: ${request.nextUrl.pathname}`);
  return new NextResponse('Not Found', { status: 404 });
}