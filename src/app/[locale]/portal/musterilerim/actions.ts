"use server";

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addMyCustomerAction(formData: FormData, locale: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const unvan = (formData.get('unvan') || '').toString().trim();
  const telefon = (formData.get('telefon') || '').toString().trim() || null;
  const email = (formData.get('email') || '').toString().trim() || null;
  const adres = (formData.get('adres') || '').toString().trim() || null;
  const kategori = (formData.get('kategori') || '').toString().trim() || null;
  const kaynak = (formData.get('kaynak') || '').toString().trim() || null;
  const yetkili_kisi = (formData.get('yetkili_kisi') || '').toString().trim() || null;
  const sehir = (formData.get('sehir') || '').toString().trim() || null;
  const ilce = (formData.get('ilce') || '').toString().trim() || null;
  const mahalle = (formData.get('mahalle') || '').toString().trim() || null;
  const posta_kodu = (formData.get('posta_kodu') || '').toString().trim() || null;
  const google_maps_url = (formData.get('google_maps_url') || '').toString().trim() || null;
  const instagram_url = (formData.get('instagram_url') || '').toString().trim() || null;
  const facebook_url = (formData.get('facebook_url') || '').toString().trim() || null;
  const web_url = (formData.get('web_url') || '').toString().trim() || null;
  const etiketler = formData.getAll('etiketler') as string[];

  if (!unvan) return { success: false, error: 'Firma adı zorunludur.' };

  // Calculate priority score
  let score = 0;
  
  // Category Score
  const catScores: Record<string, number> = {
    'Shisha & Lounge': 100,
    'Coffee Shop & Eiscafé': 90,
    'Hotel & Event': 80,
    'Casual Dining': 70,
    'Restoran': 70,
    'Alt Bayi': 60,
    'Rakip/Üretici': 0
  };
  score += catScores[kategori || ''] || 50;

  // Tag Score
  if (etiketler && etiketler.length > 0) {
    if (etiketler.includes('#Vitrin_Boş')) score += 40;
    if (etiketler.includes('#Mutfak_Yok')) score += 30;
    if (etiketler.includes('#Yeni_Açılış')) score += 25;
    if (etiketler.includes('#Türk_Sahibi')) score += 20;
    if (etiketler.includes('#Düğün_Mekanı')) score += 20;
    if (etiketler.includes('#Kahve_Odaklı')) score += 15;
    if (etiketler.includes('#Yüksek_Sirkülasyon')) score += 15;
    if (etiketler.includes('#Lüks_Mekan')) score += 10;
    if (etiketler.includes('#Teraslı')) score += 10;
    if (etiketler.includes('#Self_Service')) score += 10;
    if (etiketler.includes('#Zincir_Marka')) score -= 20;
    if (etiketler.includes('#Kendi_Üretimi')) score -= 30;
    if (etiketler.includes('#Rakip_Sözleşmeli')) score -= 30;
  }

  const { error } = await supabase
    .from('firmalar')
    .insert({ 
      unvan, 
      telefon, 
      email, 
      adres, 
      kategori,
      kaynak,
      yetkili_kisi,
      sehir,
      ilce,
      mahalle,
      posta_kodu,
      google_maps_url,
      instagram_url,
      facebook_url,
      web_url,
      etiketler: etiketler.length > 0 ? etiketler : null,
      sahip_id: user.id,
      status: 'ADAY',
      oncelik_puani: score,
      ticari_tip: 'musteri',
      goruldu: true
    });

  if (error) {
    console.error('Error adding customer:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/${locale}/portal/musterilerim`);
  return { success: true };
}
