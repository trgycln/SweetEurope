// src/middleware.ts (GÜVENLİK İYİLEŞTİRMESİ YAPILMIŞ HALİ)

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const locales = ['de', 'en', 'tr', 'ar'];
const defaultLocale = 'de';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
        return res;
    }

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

    // DEĞİŞİKLİK: Daha güvenli olan getUser() metodunu kullanıyoruz.
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        if (pathname.startsWith('/admin') || pathname.startsWith('/portal')) {
            return NextResponse.redirect(new URL('/login', req.url));
        }
    } else {
        const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
        const userRole = profile?.rol;

        const isInternalUser = userRole === 'Yönetici' || userRole === 'Ekip Üyesi';
        const isExternalUser = userRole === 'Müşteri' || userRole === 'Alt Bayi';

        if (pathname === '/login') {
            const redirectTo = isInternalUser ? '/admin/dashboard' : '/portal/dashboard';
            return NextResponse.redirect(new URL(redirectTo, req.url));
        }

        if (isInternalUser && pathname.startsWith('/portal')) {
            return NextResponse.redirect(new URL('/admin/dashboard', req.url));
        }
        if (isExternalUser && pathname.startsWith('/admin')) {
            return NextResponse.redirect(new URL('/portal/dashboard', req.url));
        }
    }
    
    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (!pathnameHasLocale && !pathname.startsWith('/login') && !pathname.startsWith('/auth')) {
         const locale = defaultLocale;
         req.nextUrl.pathname = `/${locale}${pathname}`;
         return NextResponse.redirect(req.nextUrl);
    }

    return res;
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};