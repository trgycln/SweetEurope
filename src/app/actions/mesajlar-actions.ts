'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export type IletisimMesaji = {
  id: string;
  created_at: string;
  ad_soyad: string;
  email: string;
  mesaj: string;
  okundu_mu: boolean;
  okunma_tarihi: string | null;
};

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function getMesajlarAction(): Promise<{ success: boolean; data?: IletisimMesaji[]; error?: string }> {
  try {
    const supabase = serviceClient();
    const { data, error } = await supabase
      .from('iletisim_mesajlari')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getMesajlarAction error:', error);
      return { success: false, error: 'Mesajlar alınırken bir hata oluştu.' };
    }

    return { success: true, data: data as IletisimMesaji[] };
  } catch (err) {
    console.error('getMesajlarAction catch:', err);
    return { success: false, error: 'Beklenmeyen bir hata oluştu.' };
  }
}

export async function markMesajOkunduAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = serviceClient();
    const { error } = await supabase
      .from('iletisim_mesajlari')
      .update({ okundu_mu: true, okunma_tarihi: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('markMesajOkunduAction error:', error);
      return { success: false, error: 'Mesaj okundu olarak işaretlenemedi.' };
    }

    revalidatePath('/admin/crm/mesajlar');
    return { success: true };
  } catch (err) {
    console.error('markMesajOkunduAction catch:', err);
    return { success: false, error: 'Beklenmeyen bir hata oluştu.' };
  }
}

export async function deleteMesajAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = serviceClient();
    const { error } = await supabase
      .from('iletisim_mesajlari')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteMesajAction error:', error);
      return { success: false, error: 'Mesaj silinemedi.' };
    }

    revalidatePath('/admin/crm/mesajlar');
    return { success: true };
  } catch (err) {
    console.error('deleteMesajAction catch:', err);
    return { success: false, error: 'Beklenmeyen bir hata oluştu.' };
  }
}
