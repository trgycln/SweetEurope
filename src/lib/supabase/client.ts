// src/lib/supabase/client.ts (NİHAİ VE DİNAMİK HALİ)

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/lib/supabase/database.types';

// YENİ EKLEME: Tarayıcı kapandığında oturumu silmek için 'sessionStorage' kullanmamız gerekiyor.
// Ancak bu, sunucu tarafında hata verebileceği için, 'sessionStorage'ın sadece tarayıcıda
// mevcut olup olmadığını kontrol eden güvenli bir "adaptör" oluşturuyoruz.
const customSessionStorage = {
  getItem: (key: string): string | null => {
    // Sadece tarayıcı ortamında çalışmasını garantile
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key);
    }
  },
};


// GÜNCELLEME: Mevcut `createSupabaseBrowserClient` fonksiyonunuzu, bir parametre alabilen
// daha esnek bir versiyonla değiştiriyoruz. Adını 'createDynamicSupabaseClient' olarak
// değiştirerek amacını daha net hale getiriyoruz.
export function createDynamicSupabaseClient(persistSession: boolean) {
  return createBrowserClient<Database>( // <Database> tipini koruyarak tip güvenliğini sağlıyoruz.
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // YENİ EKLEME: Auth (Kimlik Doğrulama) ayarları
      auth: {
        // Bu kısım sihrin gerçekleştiği yer:
        // Eğer persistSession true ise ("Beni Hatırla" işaretli), Supabase varsayılan olan 'localStorage'ı kullanır.
        // Eğer persistSession false ise, tarayıcı kapanınca verileri silen bizim 'customSessionStorage' adaptörümüzü kullanır.
        storage: persistSession ? undefined : customSessionStorage,
        
        // Bu ayarların kalması, oturum yönetimi için en iyi pratiklerdendir.
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
}