// src/app/admin/crm/firmalar/[firmaId]/layout.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function FirmaDetailLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Wenn kein Benutzer angemeldet ist, sofort zum Login weiterleiten.
    redirect('/login');
  }

  // Wenn der Benutzer angemeldet ist, die eigentliche Seitendatei (page.tsx) anzeigen.
  return <>{children}</>;
}