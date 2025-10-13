// src/app/admin/ayarlar/sablonlar/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables } from '@/lib/supabase/database.types';

type SablonInsert = Omit<Tables<'kategori_ozellik_sablonlari'>, 'id' | 'created_at'>;
type SablonUpdate = Partial<SablonInsert>;
const diller = ['de', 'en', 'tr', 'ar'];
const revalidatePage = () => revalidatePath('/admin/ayarlar/sablonlar');

// YENİ ÖZELLİK OLUŞTURAN ACTION (GÜNCELLENDİ)
export async function createSablonAction(formData: FormData) {
    const supabase = createSupabaseServerClient();

    // GÜNCELLEME: Çok dilli 'gosterim_adi' için JSON objesi oluşturma
    const gosterimAdiJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        gosterimAdiJson[dil] = formData.get(`gosterim_adi_${dil}`) as string || '';
    });

    const veri: SablonInsert = {
        kategori_id: formData.get('kategori_id') as string,
        alan_adi: formData.get('alan_adi') as string,
        gosterim_adi: gosterimAdiJson, // Artık bir JSON objesi
        alan_tipi: formData.get('alan_tipi') as string,
        sira: parseInt(formData.get('sira') as string || '0', 10),
        public_gorunur: formData.get('public_gorunur') === 'on',
        musteri_gorunur: formData.get('musteri_gorunur') === 'on',
        alt_bayi_gorunur: formData.get('alt_bayi_gorunur') === 'on'
    };

    if (!veri.kategori_id || !veri.alan_adi || !gosterimAdiJson.tr) {
        return { success: false, message: 'Kategori, Alan Adı ve Türkçe Gösterim Adı zorunludur.' };
    }

    const { error } = await supabase.from('kategori_ozellik_sablonlari').insert(veri);

    if (error) {
        console.error("Şablon oluşturma hatası:", error);
        return { success: false, message: 'Özellik oluşturulurken bir hata oluştu: ' + error.message };
    }

    revalidatePage();
    return { success: true, message: 'Yeni özellik başarıyla eklendi.' };
}

// MEVCUT ÖZELLİĞİ GÜNCELLEYEN ACTION (GÜNCELLENDİ)
export async function updateSablonAction(sablonId: string, formData: FormData) {
    const supabase = createSupabaseServerClient();
    
    // GÜNCELLEME: Çok dilli 'gosterim_adi' için JSON objesi oluşturma
    const gosterimAdiJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        gosterimAdiJson[dil] = formData.get(`gosterim_adi_${dil}`) as string || '';
    });

    const veri: SablonUpdate = {
        alan_adi: formData.get('alan_adi') as string,
        gosterim_adi: gosterimAdiJson, // Artık bir JSON objesi
        alan_tipi: formData.get('alan_tipi') as string,
        sira: parseInt(formData.get('sira') as string || '0', 10),
        public_gorunur: formData.get('public_gorunur') === 'on',
        musteri_gorunur: formData.get('musteri_gorunur') === 'on',
        alt_bayi_gorunur: formData.get('alt_bayi_gorunur') === 'on'
    };
    
    const { error } = await supabase.from('kategori_ozellik_sablonlari').update(veri).eq('id', sablonId);

    if (error) {
        console.error("Şablon güncelleme hatası:", error);
        return { success: false, message: 'Özellik güncellenirken bir hata oluştu: ' + error.message };
    }
    
    revalidatePage();
    return { success: true, message: 'Özellik başarıyla güncellendi.' };
}

// ÖZELLİĞİ SİLEN ACTION (Değişiklik yok)
export async function deleteSablonAction(sablonId: string) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from('kategori_ozellik_sablonlari').delete().eq('id', sablonId);
    if (error) {
        if (error.code === '23503') {
            return { success: false, message: 'Bu özellik bir üründe kullanıldığı için silinemez.' };
        }
        return { success: false, message: 'Özellik silinirken bir hata oluştu: ' + error.message };
    }
    revalidatePage();
    return { success: true, message: 'Özellik başarıyla silindi.' };
}