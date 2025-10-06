// src/app/admin/gorevler/ekle/page.tsx (FİNAL VERSİYON)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tables } from '@/lib/supabase/database.types';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import { revalidatePath } from 'next/cache';

type ProfilOption = Pick<Tables<'profiller'>, 'id' | 'tam_ad'>;
type FirmaOption = Pick<Tables<'firmalar'>, 'id' | 'unvan'>;

async function gorevEkleAction(formData: FormData) {
  'use server';

  const baslik = formData.get('baslik') as string;
  const aciklama = formData.get('aciklama') as string;
  const son_tarih = formData.get('son_tarih') as string;
  const atanan_kisi_id = formData.get('atanan_kisi_id') as string;
  const ilgili_firma_id = formData.get('ilgili_firma_id') as string;
  const oncelik = formData.get('oncelik') as Tables<'gorevler'>['oncelik'];

  if (!baslik || !atanan_kisi_id) {
    console.error("Başlık ve Atanan Kişi zorunludur.");
    return;
  }

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { error } = await supabase
    .from('gorevler')
    .insert({
      baslik: baslik,
      aciklama: aciklama || null,
      son_tarih: son_tarih || null,
      atanan_kisi_id: atanan_kisi_id,
      ilgili_firma_id: ilgili_firma_id || null,
      // FİNAL DÜZELTME: Artık veritabanında var olan bu kolona veri ekliyoruz.
      olusturan_kisi_id: user.id,
      oncelik: oncelik,
      tamamlandi: false,
    });

  if (error) {
    console.error('Görev eklenirken hata oluştu:', error.message);
  } else {
    revalidatePath('/admin/gorevler'); 
    redirect('/admin/gorevler');
  }
}

export default async function GorevEklemeSayfasi() {
  const supabase = createSupabaseServerClient();
  
  const { data: profiller } = await supabase.from('profiller').select('id, tam_ad').order('tam_ad');
  const { data: firmalar } = await supabase.from('firmalar').select('id, unvan').order('unvan');

  const profilOptions: ProfilOption[] = profiller || [];
  const firmaOptions: FirmaOption[] = firmalar || [];
  const oncelikOptions: Tables<'gorevler'>['oncelik'][] = ['Düşük', 'Orta', 'Yüksek'];

  const inputBaseClasses = "w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm text-text-main focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-text-main/50";

  return (
    <>
      <header className="mb-8">
        <Link href="/admin/gorevler" className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors mb-4">
            <FiArrowLeft />
            Görev Listesine Geri Dön
        </Link>
        <h1 className="font-serif text-4xl font-bold text-primary">Yeni Görev Oluştur</h1>
        <p className="text-text-main/80 mt-1">Gerekli bilgileri doldurarak ekibinize yeni bir görev atayın.</p>
      </header>

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
        <form action={gorevEkleAction} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                
                <div className="md:col-span-2">
                    <label htmlFor="baslik" className="block text-sm font-bold text-text-main/80 mb-2">Başlık</label>
                    <input type="text" id="baslik" name="baslik" required className={inputBaseClasses} placeholder="Örn: Yeni kampanya görsellerini hazırla"/>
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="aciklama" className="block text-sm font-bold text-text-main/80 mb-2">Açıklama</label>
                    <textarea id="aciklama" name="aciklama" rows={4} className={inputBaseClasses} placeholder="Görevin detaylarını ve beklentileri buraya yazın..."/>
                </div>

                <div>
                    <label htmlFor="atanan_kisi_id" className="block text-sm font-bold text-text-main/80 mb-2">Atanan Kişi</label>
                    <select id="atanan_kisi_id" name="atanan_kisi_id" required className={inputBaseClasses}>
                        <option value="">-- Birini Seçin --</option>
                        {profilOptions.map(p => (
                            <option key={p.id} value={p.id}>{p.tam_ad}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label htmlFor="ilgili_firma_id" className="block text-sm font-bold text-text-main/80 mb-2">İlgili Firma (Opsiyonel)</label>
                    <select id="ilgili_firma_id" name="ilgili_firma_id" className={inputBaseClasses}>
                        <option value="">-- Bir Firma Seçin --</option>
                        {firmaOptions.map(f => (
                            <option key={f.id} value={f.id}>{f.unvan}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label htmlFor="oncelik" className="block text-sm font-bold text-text-main/80 mb-2">Öncelik</label>
                    <select id="oncelik" name="oncelik" required defaultValue="Orta" className={inputBaseClasses}>
                        {oncelikOptions.map(o => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="son_tarih" className="block text-sm font-bold text-text-main/80 mb-2">Son Tarih</label>
                    <input type="date" id="son_tarih" name="son_tarih" className={inputBaseClasses} />
                </div>
            </div>

            <div className="pt-6 border-t border-bg-subtle flex justify-end">
                <button type="submit" className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm">
                    <FiSave size={18} />
                    Görevi Kaydet
                </button>
            </div>
        </form>
      </div>
    </>
  );
}