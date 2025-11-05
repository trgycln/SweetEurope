'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export interface Degerlendirme {
  id: string;
  urun_id: string;
  kullanici_id: string;
  firma_id: string | null;
  puan: number;
  baslik: string | null;
  yorum: string | null;
  resimler: string[] | null;
  onay_durumu: 'beklemede' | 'onaylandi' | 'reddedildi';
  onaylayan_id: string | null;
  onay_tarihi: string | null;
  red_nedeni: string | null;
  yardimci_oy_sayisi: number;
  yardimci_olmayan_oy_sayisi: number;
  siparis_id: string | null;
  dogrulanmis_alis: boolean;
  created_at: string;
  updated_at: string;
  kullanici_adi?: string;
  firma_adi?: string;
}

// Ürün değerlendirmelerini getir
export async function getUrunDegerlendirmeleri(urunId: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data, error } = await supabase
    .from('urun_degerlendirmeleri')
    .select(`
      *,
      profiller:kullanici_id(tam_ad),
      firmalar:firma_id(unvan)
    `)
    .eq('urun_id', urunId)
    .eq('onay_durumu', 'onaylandi')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Değerlendirmeler getirilemedi:', error);
    return [];
  }

  return data.map((d: any) => ({
    ...d,
    kullanici_adi: d.profiller?.tam_ad || 'Anonim',
    firma_adi: d.firmalar?.unvan || null,
  })) as Degerlendirme[];
}

// Kullanıcının değerlendirmesini getir
export async function getKullaniciDegerlendirmesi(urunId: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('urun_degerlendirmeleri')
    .select('*')
    .eq('urun_id', urunId)
    .eq('kullanici_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Kullanıcı değerlendirmesi getirilemedi:', error);
    return null;
  }

  return data as Degerlendirme | null;
}

// Kullanıcının ürünü satın alıp almadığını kontrol et
export async function checkUrunSatinAlindi(urunId: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('siparisler')
    .select(`
      id,
      siparis_detay!inner(urun_id)
    `)
    .eq('olusturan_kullanici_id', user.id)
    .eq('siparis_durumu', 'Teslim Edildi')
    .eq('siparis_detay.urun_id', urunId)
    .limit(1);

  if (error) {
    console.error('Satın alma kontrolü yapılamadı:', error);
    return false;
  }

  return data && data.length > 0;
}

// Yeni değerlendirme oluştur
export async function createDegerlendirme(formData: {
  urunId: string;
  puan: number;
  baslik?: string;
  yorum?: string;
  resimler?: string[];
}) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Giriş yapmalısınız' };
  }

  // Kullanıcının profil bilgilerini al (firma_id için)
  const { data: profil } = await supabase
    .from('profiller')
    .select('firma_id')
    .eq('id', user.id)
    .single();

  // Sipariş ID'sini bul (doğrulanmış alış için)
  const { data: siparis } = await supabase
    .from('siparisler')
    .select(`
      id,
      siparis_detay!inner(urun_id)
    `)
    .eq('olusturan_kullanici_id', user.id)
    .eq('siparis_durumu', 'Teslim Edildi')
    .eq('siparis_detay.urun_id', formData.urunId)
    .limit(1)
    .single();

  const { error } = await supabase
    .from('urun_degerlendirmeleri')
    .insert({
      urun_id: formData.urunId,
      kullanici_id: user.id,
      firma_id: profil?.firma_id || null,
      siparis_id: siparis?.id || null,
      puan: formData.puan,
      baslik: formData.baslik || null,
      yorum: formData.yorum || null,
      resimler: formData.resimler || null,
      dogrulanmis_alis: !!siparis,
      onay_durumu: 'beklemede', // Admin onayı bekliyor
    });

  if (error) {
    console.error('Değerlendirme oluşturulamadı:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[locale]/(public)/products`);
  return { success: true };
}

// Değerlendirmeyi güncelle
export async function updateDegerlendirme(
  degerlendirmeId: string,
  formData: {
    puan: number;
    baslik?: string;
    yorum?: string;
    resimler?: string[];
  }
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Giriş yapmalısınız' };
  }

  const { error } = await supabase
    .from('urun_degerlendirmeleri')
    .update({
      puan: formData.puan,
      baslik: formData.baslik || null,
      yorum: formData.yorum || null,
      resimler: formData.resimler || null,
      onay_durumu: 'beklemede', // Tekrar admin onayına gönder
    })
    .eq('id', degerlendirmeId)
    .eq('kullanici_id', user.id);

  if (error) {
    console.error('Değerlendirme güncellenemedi:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[locale]/(public)/products`);
  return { success: true };
}

// Değerlendirmeye oy ver (Yardımcı oldu mu?)
export async function voteDegerlendirme(
  degerlendirmeId: string,
  yardimciMi: boolean
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Giriş yapmalısınız' };
  }

  // Önce var olan oyu kontrol et
  const { data: existingVote } = await supabase
    .from('degerlendirme_oylari')
    .select('id, yardimci_mi')
    .eq('degerlendirme_id', degerlendirmeId)
    .eq('kullanici_id', user.id)
    .single();

  if (existingVote) {
    // Aynı oy ise sil, farklı oy ise güncelle
    if (existingVote.yardimci_mi === yardimciMi) {
      const { error } = await supabase
        .from('degerlendirme_oylari')
        .delete()
        .eq('id', existingVote.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from('degerlendirme_oylari')
        .update({ yardimci_mi: yardimciMi })
        .eq('id', existingVote.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }
  } else {
    // Yeni oy ekle
    const { error } = await supabase
      .from('degerlendirme_oylari')
      .insert({
        degerlendirme_id: degerlendirmeId,
        kullanici_id: user.id,
        yardimci_mi: yardimciMi,
      });

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath(`/[locale]/(public)/products`);
  return { success: true };
}

// Admin: Değerlendirmeyi onayla
export async function approveDegerlendirme(degerlendirmeId: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Giriş yapmalısınız' };
  }

  const { error } = await supabase
    .from('urun_degerlendirmeleri')
    .update({
      onay_durumu: 'onaylandi',
      onaylayan_id: user.id,
      onay_tarihi: new Date().toISOString(),
    })
    .eq('id', degerlendirmeId);

  if (error) {
    console.error('Değerlendirme onaylanamadı:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[locale]/(public)/products`);
  revalidatePath(`/[locale]/admin`);
  return { success: true };
}

// Admin: Değerlendirmeyi reddet
export async function rejectDegerlendirme(
  degerlendirmeId: string,
  redNedeni: string
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Giriş yapmalısınız' };
  }

  const { error } = await supabase
    .from('urun_degerlendirmeleri')
    .update({
      onay_durumu: 'reddedildi',
      onaylayan_id: user.id,
      onay_tarihi: new Date().toISOString(),
      red_nedeni: redNedeni,
    })
    .eq('id', degerlendirmeId);

  if (error) {
    console.error('Değerlendirme reddedilemedi:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[locale]/(public)/products`);
  revalidatePath(`/[locale]/admin`);
  return { success: true };
}

// Admin: Onay bekleyen değerlendirmeleri getir
export async function getOnayBekleyenDegerlendirmeler() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data, error } = await supabase
    .from('urun_degerlendirmeleri')
    .select(`
      *,
      profiller:kullanici_id(tam_ad, email),
      urunler:urun_id(ad)
    `)
    .eq('onay_durumu', 'beklemede')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Onay bekleyen değerlendirmeler getirilemedi:', error);
    return [];
  }

  return data.map((d: any) => ({
    ...d,
    kullanici_adi: d.profiller?.tam_ad || 'Anonim',
    kullanici_email: d.profiller?.email || '',
    urun_adi: d.urunler?.ad || '',
  }));
}
