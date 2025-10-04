// Bu dosya, Server Components ve Server Actions için Supabase istemcisini oluşturur.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!, // Admin aksiyonları için secret key kullanmak en iyisidir
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Sunucu Aksiyonu yönlendirme yaptığında bu hata oluşabilir
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Sunucu Aksiyonu yönlendirme yaptığında bu hata oluşabilir
          }
        },
      },
    }
  );
}