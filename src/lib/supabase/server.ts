// src/lib/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/supabase/database.types'

export const createSupabaseServerClient = () => {
  // HINWEIS: Die 'cookieStore' Variable existiert hier nicht mehr.

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          // cookies() wird direkt hier aufgerufen.
          return cookies().get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // cookies() wird direkt hier aufgerufen.
            cookies().set({ name, value, ...options })
          } catch (error) {
            // Kann ignoriert werden.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // cookies() wird direkt hier aufgerufen.
            cookies().set({ name, value: '', ...options })
          } catch (error) {
            // Kann ignoriert werden.
          }
        },
      },
    }
  )
}