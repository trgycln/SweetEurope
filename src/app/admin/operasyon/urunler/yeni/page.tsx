import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Database, TablesInsert } from '@/lib/supabase/database.types';
import { FiArrowLeft, FiSave, FiPackage, FiDollarSign, FiImage } from 'react-icons/fi';
import { revalidatePath } from 'next/cache';

// SERVER ACTION: Form verisini, fotoğraflarla birlikte işler.
async function yeniUrunEkleAction(formData: FormData) {
  'use server';

  const supabase = createSupabaseServerClient();

  // 1. Güvenlik: İşlemi sadece 'Yönetici' yapabilir.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');
  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  
  if (profile?.rol !== 'Yönetici') {
    console.warn("Yetkisiz ürün ekleme denemesi:", user.id);
    // DÜZELTME: Obje döndürmek yerine işlemi sonlandır.
    return;
  }
  
  // 2. Formdaki metin ve sayısal verileri çek
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

  // 3. Dosya Yükleme Akışı
  const images = formData.getAll('images') as File[];
  const imageUrls: string[] = [];

  for (const image of images) {
    if (image && image.size > 0) {
      const fileName = `${Date.now()}-${image.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('urun-gorselleri')
        .upload(`public/${fileName}`, image);

      if (uploadError) {
        console.error('Fotoğraf yükleme hatası:', uploadError);
        // DÜZELTME: Obje döndürmek yerine işlemi sonlandır.
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('urun-gorselleri')
        .getPublicUrl(uploadData.path);
      
      imageUrls.push(urlData.publicUrl);
    }
  }

  // 4. Veritabanına Kayıt İşlemi
  const insertData: TablesInsert<'urunler'> = {
    ...rawFormData,
    fotograf_url_listesi: imageUrls,
    ek_maliyetler: {},
  };

  const { error: insertError } = await supabase.from('urunler').insert(insertData);

  if (insertError) {
    console.error('Ürün eklenirken veritabanı hatası:', insertError);
    // DÜZELTME: Obje döndürmek yerine işlemi sonlandır.
    return;
  }

  // 5. Başarılı Sonuç ve Yönlendirme
  revalidatePath('/admin/operasyon/urunler');
  redirect('/admin/operasyon/urunler');
}

// YENİ ÜRÜN EKLEME SAYFASI BİLEŞENİ
export default async function YeniUrunEklePage() {
  const supabase = createSupabaseServerClient();

  // Güvenlik: Sayfaya sadece 'Yönetici' erişebilir.
  const { data: { user } } = await supabase.auth.getUser();
  // user null ise layout zaten login'e yönlendirir, burada null olmadığını varsayabiliriz.
  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user!.id).single();
  
  if (profile?.rol !== 'Yönetici') {
    return (
        <div className="p-8 text-center">
            <h1 className="font-serif text-2xl text-red-600">Erişim Reddedildi</h1>
            <p className="text-text-main mt-2">Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
            <Link href="/admin/dashboard" className="mt-4 inline-block text-accent hover:underline">Ana Panele Dön</Link>
        </div>
    );
  }

  const inputBaseClasses = "w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm text-text-main focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-text-main/50";

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <Link href="/admin/operasyon/urunler" className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors mb-4">
            <FiArrowLeft />
            Ürün Kataloğuna Geri Dön
        </Link>
        <h1 className="font-serif text-4xl font-bold text-primary">Yeni Ürün Ekle</h1>
        <p className="text-text-main/80 mt-1">Yeni bir ürünü sisteme kaydedin.</p>
      </header>

      <form action={yeniUrunEkleAction} className="space-y-10">
        
        <fieldset className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
          <legend className="font-serif text-2xl font-bold text-primary flex items-center gap-3 mb-6"><FiPackage /> Temel Bilgiler</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="md:col-span-2">
              <label htmlFor="urun_adi" className="block text-sm font-bold text-text-main/80 mb-2">Ürün Adı <span className="text-red-500">*</span></label>
              <input type="text" id="urun_adi" name="urun_adi" required className={inputBaseClasses} placeholder="Örn: San Sebastian Cheesecake"/>
            </div>
            <div>
              <label htmlFor="urun_kodu" className="block text-sm font-bold text-text-main/80 mb-2">Ürün Kodu <span className="text-red-500">*</span></label>
              <input type="text" id="urun_kodu" name="urun_kodu" required className={inputBaseClasses} placeholder="Örn: PRD-SSC-001"/>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="aciklama" className="block text-sm font-bold text-text-main/80 mb-2">Açıklama</label>
              <textarea id="aciklama" name="aciklama" rows={3} className={inputBaseClasses} placeholder="Ürünün özellikleri, içeriği vb."/>
            </div>
          </div>
        </fieldset>

        <fieldset className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
          <legend className="font-serif text-2xl font-bold text-primary flex items-center gap-3 mb-6"><FiDollarSign /> Fiyatlandırma ve Stok</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            <div>
              <label htmlFor="alis_fiyati" className="block text-sm font-bold text-text-main/80 mb-2">Alış Fiyatı (Maliyet) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" id="alis_fiyati" name="alis_fiyati" required className={inputBaseClasses} placeholder="0.00"/>
            </div>
            <div>
              <label htmlFor="temel_satis_fiyati" className="block text-sm font-bold text-text-main/80 mb-2">Temel Satış Fiyatı <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" id="temel_satis_fiyati" name="temel_satis_fiyati" required className={inputBaseClasses} placeholder="0.00"/>
            </div>
            <div>
              <label htmlFor="hedef_kar_marji" className="block text-sm font-bold text-text-main/80 mb-2">Hedef Kâr Marjı (%)</label>
              <input type="number" step="0.1" id="hedef_kar_marji" name="hedef_kar_marji" className={inputBaseClasses} placeholder="Örn: 40"/>
            </div>
            <div>
              <label htmlFor="stok_adeti" className="block text-sm font-bold text-text-main/80 mb-2">Başlangıç Stok Adedi <span className="text-red-500">*</span></label>
              <input type="number" id="stok_adeti" name="stok_adeti" required className={inputBaseClasses} placeholder="0"/>
            </div>
            <div>
              <label htmlFor="stok_azaldi_esigi" className="block text-sm font-bold text-text-main/80 mb-2">"Stok Azaldı" Eşiği</label>
              <input type="number" id="stok_azaldi_esigi" name="stok_azaldi_esigi" defaultValue="10" className={inputBaseClasses}/>
            </div>
            <div>
              <label htmlFor="stok_bitti_esigi" className="block text-sm font-bold text-text-main/80 mb-2">"Tükendi" Eşiği</label>
              <input type="number" id="stok_bitti_esigi" name="stok_bitti_esigi" defaultValue="0" className={inputBaseClasses}/>
            </div>
          </div>
        </fieldset>

        <fieldset className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
          <legend className="font-serif text-2xl font-bold text-primary flex items-center gap-3 mb-6"><FiImage /> Ürün Görselleri</legend>
          <input 
            type="file" 
            name="images" 
            multiple
            accept="image/png, image/jpeg, image/webp"
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"
          />
          <p className="text-xs text-text-main/60 mt-2">Birden fazla görsel seçebilirsiniz. (PNG, JPG, WEBP)</p>
        </fieldset>

        <div className="pt-6 flex justify-end gap-4">
            <Link href="/admin/operasyon/urunler" className="px-6 py-3 bg-secondary hover:bg-bg-subtle text-text-main rounded-lg font-bold text-sm transition-colors">
                İptal
            </Link>
            <button type="submit" className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm">
                <FiSave size={18} />
                Ürünü Kaydet
            </button>
        </div>
      </form>
    </div>
  );
}