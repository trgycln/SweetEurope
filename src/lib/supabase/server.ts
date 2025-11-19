// lib/supabase/server.ts
// FINALE VERSION (async, erwartet cookieStore, async Cookie-Handler, KEIN await headers, KEINE global.headers)

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { headers, cookies, ReadonlyRequestCookies } from 'next/headers'; // ReadonlyRequestCookies importieren
import { Database } from './database.types';

// Hauptfunktion ist async, erwartet cookieStore
export const createSupabaseServerClient = async (cookieStoreInput?: ReadonlyRequestCookies | Awaited<ReturnType<typeof cookies>>) => {

  const store = cookieStoreInput;
  if (!store) {
      // Wichtiger Check
      console.error("FATAL: cookieStore wurde nicht an createSupabaseServerClient übergeben!");
      throw new Error("cookieStore fehlt in createSupabaseServerClient");
  }

  // headers() artık async olabilir, await ile çağıralım
  const hdrs = await headers();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('FATAL: Supabase URL/Key fehlt im Server-Kontext.');
    // Optional: Fehler werfen statt nur loggen
    throw new Error('Supabase-Umgebungsvariablen (URL oder Key) fehlen im Server-Kontext.');
  }

  return createServerClient<Database>(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        // 'async' HIER ist wichtig für die Kompatibilität mit @supabase/ssr
        async get(name: string) {
          // Verwende get direkt auf dem store
          // 'get' kann async sein, je nach Adapter/Next.js Version
          const cookie = await store.get(name);
          return cookie?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            // Verwende set direkt auf dem store
            await store.set({ name, value, ...options });
          } catch (error) {
            // Fehler beim Setzen des Cookies ignorieren (kann in Server Actions passieren)
            // console.warn('Fehler beim Setzen des Cookies:', error);
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            // Verwende set zum Löschen direkt auf dem store
            await store.set({ name, value: '', ...options });
          } catch (error) {
             // Fehler beim Löschen ignorieren
             // console.warn('Fehler beim Löschen des Cookies:', error);
          }
        },
      },
      // global: { // Auskommentiert, da es möglicherweise Probleme verursacht
      //   headers: {
      //     ...Object.fromEntries(hdrs.entries()),
      //   },
      // },
    }
  );
};