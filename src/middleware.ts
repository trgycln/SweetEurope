// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// === DİL AYARLARI (i18n) ===
// Desteklenen dillerin listesi
const locales = ['de', 'en', 'tr', 'ar'];
// Projenin varsayılan dili. Yönlendirme her zaman bu dile yapılacaktır.
const defaultLocale = 'de';
// Dil yönlendirmesinden muaf tutulacak, her zaman dilsiz kalması gereken yollar.
const publicPathsToExclude = ['/login'];


/**
 * İsteğe göre yönlendirilecek dili belirler.
 * Mevcut ayar: Tarayıcı dilini dikkate almaz, HER ZAMAN projenin varsayılan dilini ('de') döndürür.
 */
function getLocale(request: NextRequest): string {
  return defaultLocale;
}


export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  // 1. ADIM: Teknik Rotaları Es Geç
  // API, Next.js'in iç dosyaları veya resim gibi statik dosyaları middleware mantığından muaf tut.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') // örn: favicon.ico, sitemap.xml
  ) {
    return res;
  }

  // 2. ADIM: KORUNAN ROTALAR İÇİN GÜVENLİK MANTIĞI
  const isProtectedPath = pathname.startsWith('/admin') || pathname.startsWith('/portal');
  if (isProtectedPath) {
    // Middleware içinde Supabase istemcisini oluştur.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => req.cookies.get(name)?.value,
          set: (name, value, options) => res.cookies.set({ name, value, ...options }),
          remove: (name, options) => res.cookies.set({ name, value: '', ...options }),
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    // Eğer kullanıcı giriş yapmamışsa, login sayfasına yönlendir.
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Kullanıcı giriş yapmışsa, rolüne göre yetkilendirme yap.
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    const userRole = profile?.rol;
    const isInternalUser = userRole === 'Yönetici' || userRole === 'Ekip Üyesi';
    const isExternalUser = userRole === 'Müşteri' || userRole === 'Alt Bayi';
    
    // Yetkisiz erişim denemelerini engelle.
    if (isInternalUser && pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    if (isExternalUser && pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/portal/dashboard', req.url));
    }
    
    // Yetkili kullanıcı ise, istediği sayfaya devam etmesine izin ver.
    return res;
  }
  
  // 3. ADIM: DİĞER TÜM PUBLIC ROTALAR İÇİN DİL YÖNLENDİRME MANTIĞI
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Eğer URL'de zaten bir dil kodu varsa veya muaf tutulan bir yolsa (örn: /login), hiçbir şey yapma.
  if (pathnameHasLocale || publicPathsToExclude.includes(pathname)) {
    return res;
  }
  
  // Aksi halde, kullanıcıyı varsayılan dile ('de') yönlendir.
  const locale = getLocale(req);
  req.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(req.nextUrl);
}

// Middleware'in hangi yollarda çalışacağını belirten yapılandırma.
// Yukarıdaki mantığın tüm sayfa isteklerinde çalışması için bu ayar gereklidir.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};