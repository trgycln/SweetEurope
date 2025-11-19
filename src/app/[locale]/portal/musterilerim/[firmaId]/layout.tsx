import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { usePathname } from 'next/navigation';
import MusteriTabs from './MusteriTabs';

export default async function MusteriLayout({ children, params }: { children: React.ReactNode; params: { locale: Locale, firmaId: string } }) {
  const { locale, firmaId } = params as any;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: firma } = await supabase.from('firmalar').select('id, unvan').eq('id', firmaId).eq('sahip_id', user.id).single();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-4xl font-bold text-primary">{firma?.unvan || 'Müşteri'}</h1>
        <p className="text-text-main/80 mt-1">Müşteriye Ait Detaylar & Yönetim</p>
      </header>

      <main>
        <MusteriTabs firmaId={firmaId} locale={locale} />
        <div className="mt-6 bg-white p-6 sm:p-8 rounded-b-lg shadow-lg border border-gray-200">
          {children}
        </div>
      </main>
    </div>
  );
}
