// src/app/admin/crm/firmalar/[firmaId]/kisiler/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiUserPlus } from 'react-icons/fi';
import { yeniKisiEkleAction } from './actions';
import KisiKarti from './KisiKarti'; // YENİ: KisiKarti bileşenini import et

export default async function IlgiliKisilerPage({ params }: { params: { firmaId: string } }) {
    const supabase = createSupabaseServerClient();

    const { data: kisiler, error } = await supabase
        .from('dis_kontaklar')
        .select('*')
        .eq('firma_id', params.firmaId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("İlgili kişiler çekilirken hata:", error);
        return <div>İlgili kişiler yüklenemedi.</div>
    }

    const formActionWithId = yeniKisiEkleAction.bind(null, params.firmaId);
    const inputBaseClasses = "w-full bg-white border border-bg-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sol Taraf: Yeni Kişi Ekleme Formu (değişiklik yok) */}
            <div className="lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Yeni Kişi Ekle</h2>
                <form action={formActionWithId} className="space-y-4 p-4 bg-secondary/50 rounded-lg border">
                    <div>
                        <label htmlFor="ad_soyad" className="block text-sm font-bold text-text-main/80 mb-2">Ad Soyad <span className="text-red-500">*</span></label>
                        <input type="text" id="ad_soyad" name="ad_soyad" required className={inputBaseClasses} />
                    </div>
                    <div>
                        <label htmlFor="unvan" className="block text-sm font-bold text-text-main/80 mb-2">Unvan</label>
                        <input type="text" id="unvan" name="unvan" placeholder="Örn: Satın Alma Müdürü" className={inputBaseClasses} />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-text-main/80 mb-2">E-posta</label>
                        <input type="email" id="email" name="email" className={inputBaseClasses} />
                    </div>
                    <div>
                        <label htmlFor="telefon" className="block text-sm font-bold text-text-main/80 mb-2">Telefon</label>
                        <input type="tel" id="telefon" name="telefon" className={inputBaseClasses} />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="flex items-center justify-center gap-2 px-6 py-2 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm">
                            <FiUserPlus size={16} /> Kişiyi Ekle
                        </button>
                    </div>
                </form>
            </div>

            {/* Sağ Taraf: İlgili Kişiler Listesi (GÜNCELLENDİ) */}
            <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">İlgili Kişiler</h2>
                <div className="space-y-4">
                    {kisiler && kisiler.length > 0 ? (
                        // Eski karmaşık JSX yerine, artık sadece KisiKarti bileşenini kullanıyoruz.
                        kisiler.map(kisi => (
                            <KisiKarti key={kisi.id} kisi={kisi} />
                        ))
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg">
                            <p className="text-text-main/70">Bu firma için henüz bir ilgili kişi kaydedilmemiş.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}