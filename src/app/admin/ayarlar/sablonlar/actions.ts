// src/app/admin/ayarlar/sablonlar/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables } from '@/lib/supabase/database.types';

type SablonInsert = Omit<Tables<'kategori_ozellik_sablonlari'>, 'id' | 'created_at'>;
type SablonUpdate = Partial<SablonInsert>;

// YENİ ÖZELLİK OLUŞTURAN ACTION
export async function createSablonAction(formData: FormData) {
    const supabase = createSupabaseServerClient();

    const veri: SablonInsert = {
        kategori_id: formData.get('kategori_id') as string,
        alan_adi: formData.get('alan_adi') as string,
        gosterim_adi: formData.get('gosterim_adi') as string,
        alan_tipi: formData.get('alan_tipi') as string,
        sira: parseInt(formData.get('sira') as string || '0', 10),
        public_gorunur: formData.get('public_gorunur') === 'on',
        musteri_gorunur: formData.get('musteri_gorunur') === 'on',
        alt_bayi_gorunur: formData.get('alt_bayi_gorunur') === 'on'
    };

    if (!veri.kategori_id || !veri.alan_adi || !veri.gosterim_adi) {
        return { success: false, message: 'Kategori, Alan Adı ve Gösterim Adı zorunludur.' };
    }

    const { error } = await supabase.from('kategori_ozellik_sablonlari').insert(veri);

    if (error) {
        console.error("Şablon oluşturma hatası:", error);
        return { success: false, message: 'Özellik oluşturulurken bir hata oluştu: ' + error.message };
    }

    revalidatePath('/admin/ayarlar/sablonlar');
    return { success: true, message: 'Yeni özellik başarıyla eklendi.' };
}

// MEVCUT ÖZELLİĞİ GÜNCELLEYEN ACTION
export async function updateSablonAction(sablonId: string, formData: FormData) {
    const supabase = createSupabaseServerClient();
    
    const veri: SablonUpdate = {
        alan_adi: formData.get('alan_adi') as string,
        gosterim_adi: formData.get('gosterim_adi') as string,
        alan_tipi: formData.get('alan_tipi') as string,
        sira: parseInt(formData.get('sira') as string || '0', 10),
        public_gorunur: formData.get('public_gorunur') === 'on',
        musteri_gorunur: formData.get('musteri_gorunur') === 'on',
        alt_bayi_gorunur: formData.get('alt_bayi_gorunur') === 'on'
    };
    
    const { error } = await supabase.from('kategori_ozellik_sablonlari').update(veri).eq('id', sablonId);

    if (error) {
        // ... hata yönetimi ...
    }
    
    revalidatePath('/admin/ayarlar/sablonlar');
    return { success: true, message: 'Özellik güncellendi.' };
}

// ÖZELLİĞİ SİLEN ACTION
export async function deleteSablonAction(sablonId: string) {
    const supabase = createSupabaseServerClient();
    
    const { error } = await supabase.from('kategori_ozellik_sablonlari').delete().eq('id', sablonId);
    
    if (error) {
        // ... hata yönetimi ...
    }

    revalidatePath('/admin/ayarlar/sablonlar');
    return { success: true, message: 'Özellik silindi.' };
}