// src/middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/database.types'; // DÜZELTME 1: Database tipini import et

export async function middleware(req: NextRequest) {
  let res = NextResponse.next();

  // DÜZELTME 2: Fonksiyonu çağırırken <Database> tipini belirt.
  // Bu, TypeScript'in doğru fonksiyon overload'unu seçmesini ve 'cookies' objesini doğru tanımasını sağlar.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options });
          res = NextResponse.next({
            request: { headers: req.headers },
          });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options });
          res = NextResponse.next({
            request: { headers: req.headers },
          });
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const { pathname } = req.nextUrl;

  // Oturum yoksa ve korumalı bir sayfaya gidiyorsa login'e yönlendir
  if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/portal'))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Oturum varsa rol kontrolü yap
  if (user) {
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    const userRole = profile?.rol;

    // Admin/Ekip Üyesi portal'a gitmeye çalışırsa -> admin'e yönlendir
    if ((userRole === 'Yönetici' || userRole === 'Ekip Üyesi') && pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }

    // Müşteri admin'e gitmeye çalışırsa -> portal'a yönlendir
    if ((userRole === 'Müşteri' || userRole === 'Alt Bayi') && pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/portal/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/portal/:path*'],
};