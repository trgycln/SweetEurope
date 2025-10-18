// src/lib/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './database.types'; // Veritabanı tiplerinizin yolunu kontrol edin

export const createSupabaseServerClient = () => {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 'get' fonksiyonunu asenkron hale getiriyoruz
        async get(name: string) {
          return cookieStore.get(name)?.value
        },
        // 'set' fonksiyonunu asenkron hale getiriyoruz
        async set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Sunucu eylemleri ve rota işleyicileri gibi
            // istemci tarafında güncellenmiş cookie'yi geri gönderemediğimizde
            // bu bir hataya neden olabilir. Bu durumda hata yoksayılabilir.
          }
        },
        // 'remove' fonksiyonunu asenkron hale getiriyoruz
        async remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Yukarıdakiyle aynı nedenle hata yoksayılabilir.
          }
        },
      },
    }
  )
}