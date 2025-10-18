// src/app/[locale]/admin/crm/firmalar/yeni/page.tsx

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Database, Tables, Enums, TablesInsert } from '@/lib/supabase/database.types';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import { revalidatePath } from 'next/cache';

// Tip Tanımları
type ProfilOption = Pick<Tables<'profiller'>, 'id' | 'tam_ad'>;
type UserRole = Enums<'user_role'>;

// SERVER ACTION: Form verisini alıp veritabanına işler.
async function yeniFirmaEkleAction(formData: FormData) {
  'use server';

  // 1. Form verilerini çek
  const unvan = formData.get('unvan') as string;
  const kategori = formData.get('kategori') as Enums<'firma_kategori'>;
  const adres = formData.get('adres') as string;
  const telefon = formData.get('telefon') as string;
  const email = formData.get('email') as string;
  // DÜZELTME 1: Formdan gelen veriyi doğru isimle alıyoruz.
  const sorumlu_personel_id = formData.get('sorumlu_personel_id') as string;

  // 2. Gerekli doğrulamaları yap
  if (!unvan || !kategori) {
    console.error("Firma Unvanı ve Kategori zorunludur.");
    return;
  }

  const supabase = createSupabaseServerClient();

  // 3. Oturum açmış kullanıcıyı ve rolünü al
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  const userRole = profile?.rol;

  // 4. Veritabanına eklenecek veriyi hazırla
  const insertData: TablesInsert<'firmalar'> = {
    unvan,
    kategori,
    adres: adres || null,
    telefon: telefon || null,
    email: email || null,
    status: 'Potansiyel',
  };

  // 5. Akıllı Atama Kuralı'nı uygula
  if (userRole === 'Ekip Üyesi') {
    // DÜZELTME 2: Veritabanına doğru sütun adıyla veri ekliyoruz.
    insertData.sorumlu_personel_id = user.id;
  } else if (userRole === 'Yönetici' && sorumlu_personel_id) {
    // DÜZELTME 3: Veritabanına doğru sütun adıyla veri ekliyoruz.
    insertData.sorumlu_personel_id = sorumlu_personel_id;
  }

  // 6. Veritabanına kaydet
  const { error } = await supabase.from('firmalar').insert(insertData);

  // 7. Hata kontrolü ve yönlendirme
  if (error) {
    console.error('Firma eklenirken hata oluştu:', error.message);
  } else {
    revalidatePath('/admin/crm/firmalar');
    redirect('/admin/crm/firmalar');
  }
}

// YENİ FİRMA EKLEME SAYFASI BİLEŞENİ
export default async function YeniFirmaEklePage() {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login'); // Kullanıcı yoksa login sayfasına yönlendir

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  const userRole: UserRole | null = profile?.rol ?? null;
  
  const { data: profiller } = await supabase.from('profiller').select('id, tam_ad').order('tam_ad');
  
  const kategoriOptions: Enums<'firma_kategori'>[] = ["Kafe", "Restoran", "Otel", "Alt Bayi", "Zincir Market"];
  
  const inputBaseClasses = "w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm text-text-main focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-text-main/50";

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <Link href="/admin/crm/firmalar" className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors mb-4">
          <FiArrowLeft />
          Firma Listesine Geri Dön
        </Link>
        <h1 className="font-serif text-4xl font-bold text-primary">Yeni Firma Ekle</h1>
        <p className="text-text-main/80 mt-1">Yeni bir potansiyel müşteri kaydı oluşturun.</p>
      </header>

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
        <form action={yeniFirmaEkleAction}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            <div className="md:col-span-2">
              <label htmlFor="unvan" className="block text-sm font-bold text-text-main/80 mb-2">Firma Unvanı <span className="text-red-500">*</span></label>
              <input type="text" id="unvan" name="unvan" required className={inputBaseClasses} placeholder="Örn: Lezzetli Mola Kafe"/>
            </div>

            <div>
              <label htmlFor="kategori" className="block text-sm font-bold text-text-main/80 mb-2">Kategori <span className="text-red-500">*</span></label>
              <select id="kategori" name="kategori" required className={inputBaseClasses}>
                <option value="">-- Kategori Seçin --</option>
                {kategoriOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {userRole === 'Yönetici' ? (
              <div>
                {/* DÜZELTME 4: Form elemanının 'htmlFor', 'id' ve 'name' özelliklerini güncelliyoruz. */}
                <label htmlFor="sorumlu_personel_id" className="block text-sm font-bold text-text-main/80 mb-2">Sorumlu Personel (Opsiyonel)</label>
                <select id="sorumlu_personel_id" name="sorumlu_personel_id" className={inputBaseClasses}>
                  <option value="">-- Personel Ata --</option>
                  {(profiller || []).map(p => <option key={p.id} value={p.id}>{p.tam_ad}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-text-main/80 mb-2">Sorumlu Personel</label>
                <div className={`${inputBaseClasses} bg-bg-subtle`}>
                  <p>Bu firma otomatik olarak size atanacak.</p>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-text-main/80 mb-2">E-posta</label>
              <input type="email" id="email" name="email" className={inputBaseClasses} placeholder="iletisim@firma.com"/>
            </div>

            <div>
              <label htmlFor="telefon" className="block text-sm font-bold text-text-main/80 mb-2">Telefon</label>
              <input type="tel" id="telefon" name="telefon" className={inputBaseClasses} placeholder="05XX XXX XX XX"/>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="adres" className="block text-sm font-bold text-text-main/80 mb-2">Adres</label>
              <textarea id="adres" name="adres" rows={3} className={inputBaseClasses} placeholder="Firma adresi..."/>
            </div>
          </div>

          <div className="pt-8 mt-6 border-t border-bg-subtle flex justify-end gap-4">
            <Link href="/admin/crm/firmalar" className="px-6 py-3 bg-secondary hover:bg-bg-subtle text-text-main rounded-lg font-bold text-sm transition-colors">
              İptal
            </Link>
            <button type="submit" className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm">
              <FiSave size={18} />
              Firmayı Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}