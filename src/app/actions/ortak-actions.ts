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
    let gercekTutar = Math.abs(tutar);
    const eksiIslemler = ['Sermaye Çıkışı', 'Ortak Para Çekimi (Maaş/Avans)'];
    if (eksiIslemler.includes(islem_tipi)) {
        gercekTutar = -gercekTutar;
    }

    let dbIslemTipi = islem_tipi;
    if (islem_tipi === 'Ortak Para Çekimi (Maaş/Avans)') {
        dbIslemTipi = 'Şahsi Harcama / Avans'; // Veritabanı constraint'ine takılmamak için eşleme
    }

    const { data: insertedIslem, error } = await supabase.from('ortak_islemleri').insert({
        ortak_id,
        islem_tipi: dbIslemTipi,
        tarih: new Date(tarih).toISOString(),
        tutar: gercekTutar,
        aciklama,
        islem_yapan_kullanici_id: user.id
    }).select('id').single();

    if (error || !insertedIslem) {
        console.error('Error creating ortak_islemi:', error);
        return { success: false, error: error?.message || 'Kayıt oluşturulamadı' };
    }

    const insertedId = insertedIslem.id;

    // Otomasyon: Eğer Ortak Para Çekimi ise, Giderler tablosuna ekle!
    if (islem_tipi === 'Ortak Para Çekimi (Maaş/Avans)') {
        const { data: ortak } = await supabase.from('profiller').select('tam_ad').eq('id', ortak_id).single();
        const ortakAdi = ortak?.tam_ad || 'Ortak';
        
        await supabase.from('giderler').insert({
            kategori_ad: 'Personel (Maaş, SGK, yemek)',
            aciklama: `${ortakAdi} - Çekilen Para (Maaş/Avans): ${aciklama || ''}`,
            tutar: Math.abs(tutar),
            tarih: new Date(tarih).toISOString(),
            kasa_tipi: kasa_tipi || 'Banka', // Kasa seçilmediyse bile giderde banka olarak işaretlenebilir
            islem_yapan_kullanici_id: user.id,
            durum: 'Onaylandı',
            otomatik_eklendi: true,
            kaynak: 'ortak_islemleri',
            kaynak_id: insertedId
        });
    }

    // Otomasyon: Kasa Seçimi Varsa Kasa İşlemlerine Yansıt
    if (kasa_tipi && ['Banka', 'Nakit'].includes(kasa_tipi)) {
        const { data: ortak } = await supabase.from('profiller').select('tam_ad').eq('id', ortak_id).single();
        const ortakAdi = ortak?.tam_ad || 'Ortak';
        
        let kasaIslemTipi = 'diger_cikis';
        if (islem_tipi === 'Sermaye Ekleme') kasaIslemTipi = 'sermaye_girisi';
        else if (islem_tipi === 'Sermaye Çıkışı') kasaIslemTipi = 'sermaye_cikisi';
        else if (islem_tipi === 'Ortak Para Çekimi (Maaş/Avans)') kasaIslemTipi = 'diger_cikis';

        await supabase.from('finans_kasa_islemleri').insert({
            islem_tipi: kasaIslemTipi,
            kasa_tipi: kasa_tipi,
            tutar: Math.abs(tutar),
            aciklama: `Ortak Cari: ${ortakAdi} - ${aciklama || islem_tipi} [Ref:${insertedId}]`,
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

    // Önce bağlı olan Giderler ve Kasa kayıtlarını silelim
    await supabase.from('giderler').delete().eq('kaynak_id', id);
    await supabase.from('finans_kasa_islemleri').delete().like('aciklama', `%[Ref:${id}]%`);

    // Sonra ana işlemi silelim
    const { error } = await supabase.from('ortak_islemleri').delete().eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/idari/finans/kasa');
    revalidatePath('/admin/idari/finans/giderler');
    revalidatePath('/admin/idari/finans/ortaklar');
    return { success: true };
}

export async function distributeKarPayiAction(
    dagitimListesi: { ortak_id: string; tutar: number; ortak_adi: string }[],
    kasa_tipi: string,
    tarih: string,
    genelAciklama: string
) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (!user.email || !SUPER_ADMIN_EMAILS.includes(user.email)) {
        return { success: false, error: 'Bu işlem için Süper Admin yetkisi gereklidir.' };
    }

    const islemTarihi = new Date(tarih).toISOString();

    for (const dagitim of dagitimListesi) {
        if (dagitim.tutar <= 0) continue;

        // 1. Ortak işlemini oluştur
        const { data: insertedIslem, error } = await supabase.from('ortak_islemleri').insert({
            ortak_id: dagitim.ortak_id,
            islem_tipi: 'Kar Payı / Temettü',
            tarih: islemTarihi,
            tutar: -dagitim.tutar, // Alacak bakiyesini düşürür / kasadan çıkar
            aciklama: genelAciklama || 'Toplu Kâr Payı Dağıtımı',
            islem_yapan_kullanici_id: user.id
        }).select('id').single();

        if (error || !insertedIslem) {
            console.error('Kâr payı dağıtım hatası:', error);
            continue; // Hata olsa da diğerlerine devam etmeye çalış
        }

        // 2. Kasa çıkışını oluştur (Eğer Kasa seçildiyse)
        if (kasa_tipi && ['Banka', 'Nakit'].includes(kasa_tipi)) {
            await supabase.from('finans_kasa_islemleri').insert({
                islem_tipi: 'diger_cikis',
                kasa_tipi: kasa_tipi,
                tutar: dagitim.tutar,
                aciklama: `Kâr Payı Dağıtımı: ${dagitim.ortak_adi} - ${genelAciklama || 'Temettü'} [Ref:${insertedIslem.id}]`,
                tarih: islemTarihi,
                islem_yapan_id: user.id
            });
        }
        
        // DİKKAT: Gider tablosuna KAYIT ATILMAZ! Çünkü bu ticari bir gider değil, sermaye kâr payıdır.
    }

    revalidatePath('/admin/idari/finans/kasa');
    revalidatePath('/admin/idari/finans/ortaklar');
    return { success: true };
}
