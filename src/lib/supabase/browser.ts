// lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr'

// Tarayıcı tarafında (Client Components) kullanılacak Supabase client'ı
export function createDynamicSupabaseClient(true) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}