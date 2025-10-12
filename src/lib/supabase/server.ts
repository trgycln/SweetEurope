// src/lib/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './database.types' // Stellen Sie sicher, dass dieser Pfad korrekt ist

export function createSupabaseServerClient() {
  const cookieStore = cookies()

  // Dies erstellt den vollständigen Supabase-Client mit der .from()-Methode
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Die `set` Methode kann in Server-Aktionen oder Route Handlers fehlschlagen
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Die `delete` Methode kann in Server-Aktionen oder Route Handlers fehlschlagen
          }
        },
      },
    }
  )
}