// src/lib/data/auth-helpers.ts

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';

// Profilimiz için TypeScript tipi
export type Profile = {
  id: string;
  rol: 'Yönetici' | 'Ekip Üyesi' | null;
  // Gelecekte eklenecek diğer profil bilgileri (isim, telefon vb.) buraya eklenebilir.
};

// Zenginleştirilmiş oturum verisi tipi
export type EnrichedSession = {
  user: User;
  profile: Profile | null; // Kullanıcı veritabanında profil oluşturmadıysa null olabilir.
};

/**
 * Oturum Zenginleştirme Fonksiyonu
 * Supabase Auth'tan gelen kullanıcı bilgisi ile veritabanındaki profil (rol) bilgisini birleştirir.
 */
export async function getEnrichedSession(): Promise<EnrichedSession | null> {
  // Server Client'ı argümansız çağırıyoruz (server.ts'in son haline göre)
  const supabase = createSupabaseServerClient();

  // 1. Supabase Auth'tan aktif kullanıcıyı al
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // Oturum yoksa hemen null döndür
  }

  // 2. Kullanıcı ID'si ile 'profiller' tablosundan rol bilgisini çek
  const { data: profileData, error: profileError } = await supabase
    .from('profiller')
    .select('id, rol') // Sadece gerekli sütunları seçiyoruz
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    // Veritabanı hatası veya profil kaydı yoksa (Güvenli ele alma)
    console.error('Profil bilgisi çekilirken hata oluştu:', profileError);
    // Hata olsa bile kullanıcı bilgisini döndür, ancak rolü null olsun.
    return {
      user: user,
      profile: null,
    };
  }

  // 3. Kullanıcı ve Profil bilgisini birleştirip döndür
  return {
    user: user,
    profile: profileData as Profile, // Tipi Profile olarak belirliyoruz
  };
}