// src/lib/supabase/client.ts

// Doğru paketten import ediyoruz.
import { createBrowserClient } from '@supabase/ssr';
// Veritabanı tiplerimizi import ederek tip güvenliği sağlıyoruz.
import { Database } from '@/lib/supabase/database.types';

// Fonksiyonun adını yeni bileşenlerimizin beklediği gibi 'createSupabaseBrowserClient' yapıyoruz
// ve <Database> tipi ile güçlendiriyoruz.
export const createSupabaseBrowserClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );