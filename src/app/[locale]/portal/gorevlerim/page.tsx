import React, { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import GorevlerClient, { GorevRow, ProfilOption, FirmaOption } from '@/components/gorevler/GorevlerClient';

export const dynamic = 'force-dynamic';

interface PortalGorevlerimPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{
    durum?: string;
    oncelik?: string;
    atanan?: string;
  }>;
}

export default async function PortalGorevlerimPage({
  params,
  searchParams
}: PortalGorevlerimPageProps) {
  noStore();

  const { locale } = await params;
  const sp = searchParams ? await searchParams : {};

  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await getGlobalCachedUser();
  if (!user) return redirect(`/${locale}/login`);

  // 1. Kullanıcı profilini ve bağlı olduğu bayi firmasını al
  const { data: profile } = await supabase
    .from('profiller')
    .select('id, tam_ad, rol, firma_id')
    .eq('id', user.id)
    .single();

  const bayiFirmaId = profile?.firma_id;

  // 2. Alt bayinin bağlı müşterilerini (firmalarını) çek
  let customerQuery = (supabase as any)
    .from('firmalar')
    .select('id, unvan')
    .order('unvan', { ascending: true });

  if (bayiFirmaId) {
    customerQuery = customerQuery
      .neq('id', bayiFirmaId)
      .not('kategori', 'eq', 'Alt Bayi')
      .or(`ust_bayi_firma_id.eq.${bayiFirmaId},sahip_id.eq.${user.id}`);
  } else {
    customerQuery = customerQuery.eq('sahip_id', user.id);
  }

  const { data: rawCustomers } = await customerQuery;
  const firmalar: FirmaOption[] = rawCustomers || [];
  const customerIds = firmalar.map(f => f.id);

  // 3. Alt bayinin görevlerini çek:
  // (Kendi açtığı, kendine atanan, kendi sahibi olduğu VEYA kendi müşterilerine ait görevler)
  let orFilters = `atanan_kisi_id.eq.${user.id},sahip_id.eq.${user.id},olusturan_kisi_id.eq.${user.id}`;
  if (customerIds.length > 0) {
    orFilters += `,ilgili_firma_id.in.(${customerIds.join(',')})`;
  }

  let tasksQuery = (supabase as any)
    .from('gorevler')
    .select('*')
    .or(orFilters)
    .order('tamamlandi', { ascending: true })
    .order('son_tarih', { ascending: true, nullsFirst: false });

  if (sp.durum === 'acik') tasksQuery = tasksQuery.eq('tamamlandi', false);
  if (sp.durum === 'tamamlandi') tasksQuery = tasksQuery.eq('tamamlandi', true);
  if (sp.oncelik) tasksQuery = tasksQuery.eq('oncelik', sp.oncelik);
  if (sp.atanan) tasksQuery = tasksQuery.eq('atanan_kisi_id', sp.atanan);

  const { data: rawTasks, error: tasksError } = await tasksQuery;

  if (tasksError) {
    console.error('Portal görevleri yüklenirken hata:', tasksError);
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
        Görevler yüklenirken bir sorun oluştu.
      </div>
    );
  }

  // 4. Personel / Profil listesi (Atama için)
  let profiller: ProfilOption[] = [
    { id: user.id, tam_ad: profile?.tam_ad || 'Ben' }
  ];

  if (bayiFirmaId) {
    const { data: dealerStaff } = await (supabase as any)
      .from('profiller')
      .select('id, tam_ad, rol')
      .eq('firma_id', bayiFirmaId)
      .not('tam_ad', 'is', null);

    if (dealerStaff && dealerStaff.length > 0) {
      profiller = dealerStaff.map((p: any) => ({
        id: p.id,
        tam_ad: p.tam_ad,
        rol: p.rol
      }));
    }
  }

  // 5. İlgili firma ve atanan kişi eşleştirmesi
  const firmaMap = new Map(firmalar.map(f => [f.id, f.unvan]));
  const profilMap = new Map(profiller.map(p => [p.id, p.tam_ad]));

  const gorevListe: GorevRow[] = (rawTasks || []).map((gorev: any) => ({
    ...gorev,
    durum: gorev.durum || (gorev.tamamlandi ? 'Tamamlandı' : 'Yapılacak'),
    ilgili_firma: gorev.ilgili_firma_id && firmaMap.has(gorev.ilgili_firma_id)
      ? { unvan: firmaMap.get(gorev.ilgili_firma_id)! }
      : null,
    atanan_kisi: gorev.atanan_kisi_id
      ? { tam_ad: profilMap.get(gorev.atanan_kisi_id) || null }
      : null,
  }));

  return (
    <main className="space-y-6 pb-12">
      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-200 rounded-3xl" />
          ))}
        </div>
      }>
        <GorevlerClient
          gorevler={gorevListe}
          profiller={profiller}
          firmalar={firmalar}
          locale={locale}
          isPortal={true}
          baseFirmaPath={`/${locale}/portal/musterilerim`}
          baseTaskDetailPath={`/${locale}/portal/gorevlerim`}
          currentUserId={user.id}
        />
      </Suspense>
    </main>
  );
}
