import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/database.types';

// 1. Request Memoization (Per-request Cache)
// Bu fonksiyonlar tek bir HTTP requesti içerisinde 1'den fazla kez çağrılırsa (örn: layout.tsx ve page.tsx),
// Supabase'e sadece 1 kez sorgu atılır, diğerleri RAM'den döner.

export const getGlobalCachedUser = cache(async () => {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    return await supabase.auth.getUser(); // Retains native { data: { user }, error } structure
});

export const getCachedUser = cache(async (supabase: SupabaseClient<Database>) => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
});

export const getCachedProfile = cache(async (supabase: SupabaseClient<Database>, userId: string) => {
    const { data: profile, error } = await supabase
        .from('profiller')
        .select('*')
        .eq('id', userId)
        .single();
    return { profile, error };
});

export const getCachedUnreadNotificationsCount = cache(async (supabase: SupabaseClient<Database>, userId: string) => {
    const { count, error } = await supabase
        .from('bildirimler')
        .select('*', { count: 'exact', head: true })
        .eq('alici_id', userId)
        .eq('okundu_mu', false);
    return { count, error };
});

// 2. Global Data Caching (Cross-request Cache)
// Bu veriler tüm adminler için aynıdır ve sık değişmez. 
// unstable_cache ile Redis/Dosya sistemine önbelleklenir.

export const getCachedCategories = unstable_cache(
    async () => {
        const supabase = createSupabaseServiceClient();
        const { data } = await supabase
            .from('kategoriler')
            .select('id, ad, ust_kategori_id');
        return data || [];
    },
    ['admin-categories'],
    { revalidate: 3600 } // 1 saat
);

export const getCachedSuppliers = unstable_cache(
    async () => {
        const supabase = createSupabaseServiceClient();
        const { data } = await supabase
            .from('tedarikciler')
            .select('id, unvan')
            .order('unvan', { ascending: true })
            .limit(1000);
        return data || [];
    },
    ['admin-suppliers'],
    { revalidate: 3600 } // 1 saat
);

export const getCachedPricingSettings = unstable_cache(
    async () => {
        const supabase = createSupabaseServiceClient();
        const { data } = await supabase
            .from('system_settings')
            .select('setting_key, setting_value')
            .eq('category', 'pricing');
            
        const pricingSettings: Record<string, number> = {};
        (data || []).forEach((s: any) => {
            const v = parseFloat(s.setting_value);
            if (Number.isFinite(v)) pricingSettings[s.setting_key] = v;
        });
        return pricingSettings;
    },
    ['admin-pricing-settings'],
    { revalidate: 3600 } // 1 saat
);

// 3. Dashboard Caching
export const getCachedDashboardData = unstable_cache(
    async (period: string) => {
        const supabase = createSupabaseServiceClient();
        const OFFENE_STATUS = ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing'];
        
        function toLocalDateString(d: Date) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        
        const now = new Date();
        const y = now.getFullYear(); 
        const mo = now.getMonth();
        
        let periodStart, periodEnd;
        if (period === 'gecen-ay') {
            periodStart = toLocalDateString(new Date(y, mo - 1, 1));
            periodEnd = toLocalDateString(new Date(y, mo, 0)); // last day of prev month
        } else if (period === 'bu-yil') {
            periodStart = toLocalDateString(new Date(y, 0, 1));
            periodEnd = now.toISOString();
        } else {
            periodStart = toLocalDateString(new Date(y, mo, 1));
            periodEnd = now.toISOString();
        }

        const prevMonthStart = toLocalDateString(new Date(y, mo - 1, 1));
        const prevMonthEnd = toLocalDateString(new Date(y, mo, 0));

        const todayISO = now.toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
        
        const [
            plRes, plPrevRes, stokRes, urunToplamRes, 
            aktifSiparisRes, siparisDagRes, sonTirRes, yaklasenTirRes,
            adayRes, temasRes, musteriRes, yeniTemasRes, 
            alarmUrunlerRes, settingsRes, yeniMusteriRes, 
            sipAdetRes, alarmCountRes, batchHistRes
        ] = await Promise.all([
            supabase.rpc('get_pl_report', { start_date: periodStart, end_date: periodEnd }).single(),
            supabase.rpc('get_pl_report', { start_date: prevMonthStart, end_date: prevMonthEnd }).single(),
            supabase.from('urunler').select('distributor_alis_fiyati, stok_miktari, stok_esigi').eq('aktif', true),
            supabase.from('urunler').select('id', { count: 'exact', head: true }),
            supabase.from('siparisler').select('id', { count: 'exact' }).in('siparis_durumu', OFFENE_STATUS),
            supabase.from('siparisler').select('siparis_durumu').gte('created_at', thirtyDaysAgo),
            supabase.from('ithalat_partileri').select('id, referans_kodu, varis_tarihi, durum, created_at').order('created_at', { ascending: false }).limit(3),
            supabase.from('ithalat_partileri').select('id, referans_kodu, varis_tarihi, durum').gte('varis_tarihi', todayISO).order('varis_tarihi', { ascending: true }).limit(1),
            supabase.from('firmalar').select('id', { count: 'exact' }).eq('status', 'ADAY'),
            supabase.from('firmalar').select('id', { count: 'exact' }).in('status', ['TEMAS EDİLDİ', 'NUMUNE VERİLDİ']),
            supabase.from('firmalar').select('id', { count: 'exact' }).in('status', ['MÜŞTERİ', 'Müşteri', 'Alt Bayi'] as any[]),
            supabase.from('firmalar').select('id', { count: 'exact' }).in('status', ['TEMAS EDİLDİ', 'NUMUNE VERİLDİ']).gte('created_at', thirtyDaysAgo),
            supabase.from('urunler').select('id, ad, stok_kodu, son_maliyet_sapma_yuzde, son_gercek_inis_maliyeti_net').eq('karlilik_alarm_aktif', true).order('son_maliyet_sapma_yuzde', { ascending: false }).limit(4),
            supabase.from('system_settings').select('setting_key, setting_value').in('setting_key', ['kasa_bakiyesi', 'hedef_ciro', 'hedef_musteri', 'hedef_temas', 'hedef_siparis']),
            supabase.from('firmalar').select('id', { count: 'exact' }).in('status', ['MÜŞTERİ', 'Alt Bayi'] as any[]).gte('created_at', `${periodStart}T00:00:00`),
            supabase.from('siparisler').select('siparis_durumu').gte('siparis_tarihi', periodStart).lte('siparis_tarihi', periodEnd),
            supabase.from('urunler').select('id', { count: 'exact' }).eq('karlilik_alarm_aktif', true),
            supabase.from('ithalat_partileri').select('id, referans_kodu, varis_tarihi, durum, created_at').order('created_at', { ascending: false }).limit(5),
        ]);

        return {
            plRes, plPrevRes, stokRes, urunToplamRes, 
            aktifSiparisRes, siparisDagRes, sonTirRes, yaklasenTirRes,
            adayRes, temasRes, musteriRes, yeniTemasRes, 
            alarmUrunlerRes, settingsRes, yeniMusteriRes, 
            sipAdetRes, alarmCountRes, batchHistRes
        };
    },
    ['admin-dashboard-data'],
    { revalidate: 60 } // 60 saniye
);
