// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Supabase istemcisini middleware context'i ile oluştur
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => req.cookies.get(name)?.value, set: (name, value, options) => res.cookies.set({ name, value, ...options }), remove: (name, options) => res.cookies.set({ name, value: '', ...options }) } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const { pathname } = req.nextUrl;

  const isAdminPath = pathname.startsWith('/admin');
  const isPortalPath = pathname.startsWith('/portal');

  // Oturum yoksa ve korumalı bir alana girmeye çalışıyorsa, login'e yönlendir.
  if (!user && (isAdminPath || isPortalPath)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Oturum varsa, rol bazlı yönlendirme yap.
  if (user) {
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    const userRole = profile?.rol;

    const isInternalUser = userRole === 'Yönetici' || userRole === 'Ekip Üyesi';
    const isExternalUser = userRole === 'Müşteri' || userRole === 'Alt Bayi';

    // İç kullanıcı, portal'a gitmeye çalışırsa -> admin'e yönlendir.
    if (isInternalUser && isPortalPath) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }

    // Dış kullanıcı (Partner), admin'e gitmeye çalışırsa -> portal'a yönlendir.
    if (isExternalUser && isAdminPath) {
      return NextResponse.redirect(new URL('/portal/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/portal/:path*'],
};