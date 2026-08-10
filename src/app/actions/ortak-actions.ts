'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { SUPER_ADMIN_EMAILS } from '@/lib/constants';

export async function getOrtakIslemleri() {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Ortaklari getir (sadece yöneticiler ve ortak yetkisi olanlar görmeli, ama RLS hallediyor)
    const { data: profiller } = await supabase.from('profiller').select('id, tam_ad, rol');
    
    // İşlemleri getir
    const { data: islemler, error } = await supabase
        .from('ortak_islemleri')
        .select(`
            id, ortak_id, tarih, islem_tipi, tutar, aciklama, created_at,
            profiller!ortak_islemleri_ortak_id_fkey(tam_ad)
        `)
        .order('tarih', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching ortak_islemleri:', error);
        return { success: false, error: error.message };
    }

    return { success: true, islemler, profiller };
}

export async function createOrtakIslemi(formData: FormData) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (!user.email || !SUPER_ADMIN_EMAILS.includes(user.email)) {
        return { success: false, error: 'Bu işlem için Süper Admin yetkisi gereklidir.' };
    }

    const ortak_id = formData.get('ortak_id') as string;
    const islem_tipi = formData.get('islem_tipi') as string;
    const tarih = formData.get('tarih') as string;
    const tutar = parseFloat(formData.get('tutar') as string);
    const aciklama = formData.get('aciklama') as string;
    const kasa_tipi = formData.get('kasa_tipi') as string | null;

    if (!ortak_id || !islem_tipi || !tutar || !tarih) {
        return { success: false, error: 'Gerekli alanlar eksik' };
    }

    // İşlem tipine göre tutar pozitif/negatif ayarlaması
    // Alacaklandıranlar (Şirket Ortağa Borçlanır): Sermaye Ekleme, Maaş Tahakkuku, Şirket İçin Cepten Harcama, Kar Payı / Temettü
    // Borçlandıranlar (Ortak Şirkete Borçlanır / Ödeme Alır): Şahsi Harcama / Avans, Maaş / Nakit Çıkışı, Sermaye Çıkışı
    let gercekTutar = Math.abs(tutar);
    const eksiIslemler = ['Şahsi Harcama / Avans', 'Maaş / Nakit Çıkışı', 'Sermaye Çıkışı'];
    if (eksiIslemler.includes(islem_tipi)) {
        gercekTutar = -gercekTutar;
    }

    const { error } = await supabase.from('ortak_islemleri').insert({
        ortak_id,
        islem_tipi,
        tarih: new Date(tarih).toISOString(),
        tutar: gercekTutar,
        aciklama,
        islem_yapan_kullanici_id: user.id
    });

    if (error) {
        console.error('Error creating ortak_islemi:', error);
        return { success: false, error: error.message };
    }

    // Otomasyon: Eğer Maaş Tahakkuku ise, Giderler tablosuna da ekle!
    if (islem_tipi === 'Maaş Tahakkuku') {
        const { data: ortak } = await supabase.from('profiller').select('tam_ad').eq('id', ortak_id).single();
        const ortakAdi = ortak?.tam_ad || 'Ortak';
        
        await supabase.from('giderler').insert({
            kategori_ad: 'Personel (Maaş, SGK, yemek)',
            aciklama: `${ortakAdi} - Maaş Tahakkuku: ${aciklama || 'Aylık Maaş'}`,
            tutar: Math.abs(tutar),
            tarih: new Date(tarih).toISOString(),
            kasa_tipi: 'Banka', // Bankadan çıkış olarak işaretlenir (veya sanal çıkış)
            islem_yapan_kullanici_id: user.id,
            durum: 'Onaylandı',
            otomatik_eklendi: true
        });
    }

    // Otomasyon: Kasa Seçimi Varsa Kasa İşlemlerine Yansıt
    if (kasa_tipi && ['Banka', 'Nakit'].includes(kasa_tipi)) {
        const { data: ortak } = await supabase.from('profiller').select('tam_ad').eq('id', ortak_id).single();
        const ortakAdi = ortak?.tam_ad || 'Ortak';
        
        let kasaIslemTipi = 'diger_cikis';
        if (islem_tipi === 'Sermaye Ekleme') kasaIslemTipi = 'sermaye_girisi';
        else if (islem_tipi === 'Sermaye Çıkışı') kasaIslemTipi = 'sermaye_cikisi';
        else if (islem_tipi === 'Maaş / Nakit Çıkışı' || islem_tipi === 'Şahsi Harcama / Avans') kasaIslemTipi = 'borc_odeme'; // Şirketten ortağa nakit çıkışı

        await supabase.from('finans_kasa_islemleri').insert({
            islem_tipi: kasaIslemTipi,
            kasa_tipi: kasa_tipi,
            tutar: Math.abs(tutar),
            aciklama: `Ortak Cari Üzerinden: ${ortakAdi} - ${aciklama || islem_tipi}`,
            tarih: new Date(tarih).toISOString(),
            islem_yapan_id: user.id
        });
        
        revalidatePath('/admin/idari/finans/kasa');
    }

    revalidatePath('/admin/idari/finans/ortaklar');
    return { success: true };
}

export async function deleteOrtakIslemi(id: string) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (!user.email || !SUPER_ADMIN_EMAILS.includes(user.email)) {
        return { success: false, error: 'Bu işlem için Süper Admin yetkisi gereklidir.' };
    }

    const { error } = await supabase.from('ortak_islemleri').delete().eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/idari/finans/ortaklar');
    return { success: true };
}
