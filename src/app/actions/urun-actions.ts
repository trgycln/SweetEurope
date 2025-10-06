// src/app/actions/urun-actions.ts

'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TablesUpdate } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function urunGuncelleAction(urunId: string, formData: FormData) {
  const supabase = createSupabaseServerClient();

  // Güvenlik kontrolü
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');
  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'Yönetici') {
    return { error: "Bu işlemi yapmaya yetkiniz yok." };
  }

  // Mevcut ürün verisini çek (eski fotoğrafları silmek için)
  const { data: mevcutUrun } = await supabase.from('urunler').select('fotograf_url_listesi').eq('id', urunId).single();
  if (!mevcutUrun) {
    return { error: "Güncellenecek ürün bulunamadı." };
  }

  const rawFormData = {
    urun_kodu: formData.get('urun_kodu') as string,
    urun_adi: formData.get('urun_adi') as string,
    aciklama: formData.get('aciklama') as string,
    alis_fiyati: parseFloat(formData.get('alis_fiyati') as string),
    temel_satis_fiyati: parseFloat(formData.get('temel_satis_fiyati') as string),
    hedef_kar_marji: parseFloat(formData.get('hedef_kar_marji') as string),
    stok_adeti: parseInt(formData.get('stok_adeti') as string, 10),
    stok_azaldi_esigi: parseInt(formData.get('stok_azaldi_esigi') as string, 10),
    stok_bitti_esigi: parseInt(formData.get('stok_bitti_esigi') as string, 10),
  };

  const updateData: TablesUpdate<'urunler'> = { ...rawFormData };
  const images = formData.getAll('images') as File[];
  const hasNewImages = images.some(image => image && image.size > 0);

  // Eğer yeni görseller yüklendiyse...
  if (hasNewImages) {
    // 1. Eski görselleri Storage'dan sil
    if (mevcutUrun.fotograf_url_listesi && mevcutUrun.fotograf_url_listesi.length > 0) {
      const oldImagePaths = mevcutUrun.fotograf_url_listesi.map(url => {
        // URL'den dosya yolunu çıkar (örn: public/12345-abc.jpg)
        const parts = url.split('/urun-gorselleri/');
        return parts[1];
      });
      await supabase.storage.from('urun-gorselleri').remove(oldImagePaths);
    }

    // 2. Yeni görselleri yükle
    const newImageUrls: string[] = [];
    for (const image of images) {
      if (image && image.size > 0) {
        const fileName = `public/${Date.now()}-${image.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('urun-gorselleri')
          .upload(fileName, image);

        if (uploadError) {
          console.error('Fotoğraf yükleme hatası:', uploadError);
          return { error: `Fotoğraf yüklenirken bir hata oluştu: ${uploadError.message}` };
        }
        
        const { data: urlData } = supabase.storage.from('urun-gorselleri').getPublicUrl(uploadData.path);
        newImageUrls.push(urlData.publicUrl);
      }
    }
    updateData.fotograf_url_listesi = newImageUrls;
  }

  // Veritabanını güncelle
  const { error: updateError } = await supabase
    .from('urunler')
    .update(updateData)
    .eq('id', urunId);

  if (updateError) {
    console.error('Ürün güncelleme hatası:', updateError);
    return { error: `Veritabanı güncellenirken bir hata oluştu: ${updateError.message}` };
  }
  
  // Önbelleği temizle
  revalidatePath('/admin/operasyon/urunler');
  revalidatePath(`/admin/operasyon/urunler/${urunId}`);

  // Başarılı olursa, hata objesi döndürme
  return { error: null };
}