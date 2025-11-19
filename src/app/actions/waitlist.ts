'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface WaitlistFormData {
  firma_adi: string;
  yetkili_kisi: string;
  email: string;
}

export interface WaitlistResponse {
  success: boolean;
  message: string;
  error?: string;
  id?: string; // oluşturulan kaydın id'si (ikinci adım için)
}

export interface ProductPreferences {
  categories?: string[]; // örn: ['cakes','coffee']
  specific_products?: string[]; // örn: ['san-sebastian','lotus-magnolia']
}

export interface UpdatePreferencesResponse {
  success: boolean;
  message: string;
  error?: string;
}

export async function submitWaitlistForm(
  formData: WaitlistFormData
): Promise<WaitlistResponse> {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // waitlist tablosuna kaydet
    // Tablo henüz type definitions'ta yok, oluşturulduktan sonra güncellenecek
    const { data, error } = await (supabase as any)
      .from('waitlist')
      .insert({
        firma_adi: formData.firma_adi,
        yetkili_kisi: formData.yetkili_kisi,
        email: formData.email,
        durum: 'beklemede',
      })
      .select()
      .single();

    if (error) {
      console.error('Waitlist kayıt hatası:', error);
      
      // Email zaten kayıtlıysa özel mesaj
      if (error.code === '23505') { // unique constraint violation
        return {
          success: false,
          message: 'Diese E-Mail-Adresse ist bereits registriert.',
          error: 'duplicate_email',
        };
      }
      
      return {
        success: false,
        message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Vielen Dank! Bitte wählen Sie jetzt Ihre bevorzugten Produkte aus.',
      id: data?.id,
    };
  } catch (error) {
    console.error('Waitlist kayıt exception:', error);
    return {
      success: false,
      message: 'Ein unerwarteter Fehler ist aufgetreten.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateWaitlistPreferences(
  waitlistId: string,
  preferences: ProductPreferences
): Promise<UpdatePreferencesResponse> {
  if (!waitlistId) {
    return { success: false, message: 'Kayıt bulunamadı.', error: 'missing_id' };
  }
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Temel normalizasyon: boş dizileri kaydetme
    const normalized: ProductPreferences = {
      categories: (preferences.categories || []).filter(Boolean),
      specific_products: (preferences.specific_products || []).filter(Boolean),
    };

    const { error } = await (supabase as any)
      .from('waitlist')
      .update({ product_preferences: normalized })
      .eq('id', waitlistId);

    if (error) {
      console.error('Waitlist preferences update error:', error);
      return { success: false, message: 'Tercihler kaydedilemedi.', error: error.message };
    }

    return { success: true, message: 'Tercihler kaydedildi.' };
  } catch (error) {
    console.error('Waitlist preferences update exception:', error);
    return {
      success: false,
      message: 'Beklenmeyen bir hata oluştu.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
