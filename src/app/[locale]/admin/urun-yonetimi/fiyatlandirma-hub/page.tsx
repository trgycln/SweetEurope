import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FiyatlandirmaHubClient from './FiyatlandirmaHubClient';

export default async function FiyatlandirmaHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);
  
  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('id, rol, tam_ad')
    .eq('id', user.id)
    .maybeSingle();
  
  const isAdmin = profil?.rol === 'Yönetici' || profil?.rol === 'Ekip Üyesi';
  if (!isAdmin) return redirect(`/${locale}/admin`);

  // Fetch all data needed for all tabs
  // Tab 1: Toplu Güncelleme - Products + Categories + System Settings
    const { data: products } = await (supabase as any)
    .from('urunler')
    .select('id, ad, kategori_id, distributor_alis_fiyati, satis_fiyati_alt_bayi, satis_fiyati_musteri, aktif, stok_kodu, teknik_ozellikler')
    .order('created_at', { ascending: false })
    .limit(500);

  const { data: kategoriler } = await (supabase as any)
    .from('kategoriler')
    .select('id, ad, ust_kategori_id, slug')
    .order('created_at', { ascending: false });

  const { data: systemSettingsRaw } = await (supabase as any)
    .from('system_settings')
    .select('setting_key, setting_value');
  
  const systemSettings: Record<string, any> = {};
  (systemSettingsRaw || []).forEach((s: any) => {
    try {
      systemSettings[s.setting_key] = JSON.parse(s.setting_value);
    } catch {
      systemSettings[s.setting_key] = s.setting_value;
    }
  });

  // Tab 2: Kurallar - Pricing Rules
  const { data: kurallar } = await (supabase as any)
    .from('fiyat_kurallari')
    .select('id, ad, kapsam, kategori_id, urun_id, kanal, firma_id, min_adet, yuzde_degisim, oncelik, aktif, baslangic_tarihi, bitis_tarihi, aciklama, created_at, kategoriler:kategori_id(ad), urunler:urun_id(ad), firmalar:firma_id(unvan)')
    .order('oncelik', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(200);

  // Tab 3: İstisnalar - Customer Overrides
  const { data: istisnalar } = await (supabase as any)
    .from('musteri_fiyat_istisnalari')
    .select('id, urun_id, firma_id, kanal, ozel_fiyat_net, baslangic_tarihi, bitis_tarihi, aciklama, created_at, urunler:urun_id(ad), firmalar:firma_id(unvan)')
    .order('created_at', { ascending: false })
    .limit(200);

  // Tab 4: Talepler - Price Change Requests
  let taleplerQuery = (supabase as any)
    .from('fiyat_degisim_talepleri')
    .select('id, created_at, urun_id, created_by, notlar, proposed_satis_fiyati_alt_bayi, proposed_satis_fiyati_musteri, status, approved_by, approved_at, urunler:urun_id(ad)')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (!isAdmin) {
    taleplerQuery = taleplerQuery.eq('created_by', user.id);
  }
  const { data: talepler } = await taleplerQuery;

  // Get user names for requests
  const userIds = Array.from(new Set(((talepler ?? []) as any[]).map(t => t.created_by).filter(Boolean)));
  const profillerById: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profs } = await (supabase as any)
      .from('profiller')
      .select('id, tam_ad')
      .in('id', userIds);
    (profs || []).forEach((p: any) => {
      profillerById[p.id] = p.tam_ad || p.id;
    });
  }

  // Tab 5: Müşteri Profilleri
  const { data: musteriProfilleri } = await (supabase as any)
    .from('musteri_profilleri')
    .select('*')
    .order('sira_no', { ascending: true })
    .order('created_at', { ascending: true });

  // Profile usage stats
  const { data: profilStats } = await (supabase as any)
    .from('firmalar')
    .select('musteri_profil_id')
    .not('musteri_profil_id', 'is', null);
  
  const profilKullanimSayisi: Record<string, number> = {};
  (profilStats || []).forEach((stat: any) => {
    const profilId = stat.musteri_profil_id;
    profilKullanimSayisi[profilId] = (profilKullanimSayisi[profilId] || 0) + 1;
  });

  // Firmalar (needed for istisna and kural forms)
  const { data: firmalar } = await (supabase as any)
    .from('firmalar')
    .select(`
      id, 
      unvan, 
      kategori,
      status,
      musteri_profil_id,
      musteri_profilleri:musteri_profil_id(ad, genel_indirim_yuzdesi)
    `)
    .order('unvan', { ascending: true })
    .limit(500);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-main mb-2">🏷️ Fiyatlandırma Yönetim Merkezi</h1>
        <p className="text-sm text-text-main/70">
          Tüm fiyatlandırma işlemlerinizi tek sayfadan yönetin: Toplu güncelleme, kurallar, istisnalar, talepler ve müşteri profilleri.
        </p>
      </div>

      <FiyatlandirmaHubClient
        locale={locale}
        products={products || []}
        kategoriler={kategoriler || []}
        systemSettings={systemSettings}
        kurallar={kurallar || []}
        istisnalar={istisnalar || []}
        talepler={talepler || []}
        profillerById={profillerById}
        musteriProfilleri={musteriProfilleri || []}
        profilKullanimSayisi={profilKullanimSayisi}
        firmalar={firmalar || []}
        isAdmin={isAdmin}
        userId={user.id}
      />
    </div>
  );
}
