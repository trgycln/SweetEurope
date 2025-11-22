'use server';

import { createClient } from '@supabase/supabase-js';

export interface WaitlistFormData {
  firma_adi: string;
  yetkili_kisi: string;
  email: string;
  telefon?: string;
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
    // Use service role key to bypass RLS for anonymous users
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. İlk önce firmalar tablosuna "Potansiyel" olarak kaydet
    const { data: firma, error: firmaError } = await supabase
      .from('firmalar')
      .insert({
        unvan: formData.firma_adi,
        email: formData.email,
        telefon: formData.telefon || null,
        status: 'Potansiyel', // Yeni web potansiyel kaydı
        kaynak: 'web', // Kaynak izleme
        // Not: contact_person yetkili kişi bilgisi waitlist tablosunda tutuluyor
      })
      .select()
      .single();

    if (firmaError) {
      console.error('Firma kayıt hatası:', firmaError);
      
      // Email zaten kayıtlıysa özel mesaj
      if (firmaError.code === '23505') { // unique constraint violation
        return {
          success: false,
          message: 'Diese E-Mail-Adresse ist bereits registriert.',
          error: 'duplicate_email',
        };
      }
      
      return {
        success: false,
        message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        error: firmaError.message,
      };
    }

    // 2. Sonra waitlist tablosuna kaydet
    const { data, error } = await supabase
      .from('waitlist')
      .insert({
        firma_adi: formData.firma_adi,
        yetkili_kisi: formData.yetkili_kisi,
        email: formData.email,
        durum: 'beklemede',
        firma_id: firma?.id, // Firma ID'sini bağla
      })
      .select()
      .single();

    if (error) {
      console.error('Waitlist kayıt hatası:', error);
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
    // Use service role key to bypass RLS for anonymous users
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Temel normalizasyon: boş dizileri kaydetme
    const normalized: ProductPreferences = {
      categories: (preferences.categories || []).filter(Boolean),
      specific_products: (preferences.specific_products || []).filter(Boolean),
    };

    const { error } = await supabase
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
