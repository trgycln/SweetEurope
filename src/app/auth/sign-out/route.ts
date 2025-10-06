// src/app/auth/sign-out/route.ts

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

// Next.js'in Route Handler'ı (eski adıyla API Route)
// POST isteğini alıp Supabase oturumunu sonlandıracak.
export async function POST(request: Request) {
  // 1. Supabase Server Client'ı oluştur
  const supabase = createSupabaseServerClient();
  
  // 2. Oturumu kapat
  await supabase.auth.signOut();

  // 3. Kullanıcıyı Login sayfasına yönlendir (302 Found)
  // redirect() kullanmak yerine, NextResponse.redirect() kullanıyoruz.
  // Not: Eğer isterseniz, bu kod bloğundan önce sadece redirect('/login') 
  // komutunu kullanarak da aynı işlevi yerine getirebilirsiniz. 
  // Ancak Route Handler'larda NextResponse.redirect kullanımı daha yaygındır.
  return NextResponse.redirect(new URL('/login', request.url), {
    status: 302,
  });
}