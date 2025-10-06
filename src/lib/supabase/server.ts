// src/lib/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/supabase/database.types';

export const createSupabaseServerClient = () => {
  // cookies() fonksiyonu bir cookie yöneticisi nesnesi döndürür.
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        // 'get' metodu, cookieStore'dan belirtilen isimdeki cookie'yi okur.
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // 'set' metodu, yeni bir cookie ayarlar veya mevcut olanı günceller.
        set(name: string, value: string, options: CookieOptions) {
          try {
            // cookieStore.set() ile cookie'yi tarayıcıya göndermek için ayarlarız.
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Sunucu Bileşeni render edildikten sonra cookie ayarlamaya çalışırsan
            // Next.js bir hata fırlatabilir. Bu try-catch bloğu bu hatayı yakalar.
            // Örneğin, bir stream sırasında cookie ayarlamaya çalışmak gibi.
          }
        },
        // 'remove' metodu, bir cookie'yi siler.
        // Aslında değeri boş bir string olarak ayarlayarak ve süresini geçmişe alarak çalışır.
        remove(name: string, options: CookieOptions) {
          try {
            // Cookie'yi silmek için değerini boş bırakıp set ediyoruz.
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // 'set' ile aynı sebepten dolayı hata yakalama bloğu burada da mevcut.
          }
        },
      },
    }
  );
};