// src/app/admin/crm/firmalar/[firmaId]/etkinlikler/page.tsx (YENİ VE MODÜLER TAM HALİ)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Enums } from '@/lib/supabase/database.types';
import { FiSend } from 'react-icons/fi';
import { yeniEtkinlikEkleAction } from './actions';
import EtkinlikKarti from './EtkinlikKarti';

type EtkinlikTipi = Enums<'etkinlik_tipi'>;

// Zaman farkını "2 saat önce", "3 gün önce" gibi formatlayan yardımcı fonksiyon
function zamanFarkiFormatla(tarihStr: string) {
    const tarih = new Date(tarihStr);
    const simdi = new Date();
    const farkSaniye = Math.floor((simdi.getTime() - tarih.getTime()) / 1000);

    let aralik = farkSaniye / 31536000;
    if (aralik > 1) return Math.floor(aralik) + " yıl önce";
    aralik = farkSaniye / 2592000;
    if (aralik > 1) return Math.floor(aralik) + " ay önce";
    aralik = farkSaniye / 86400;
    if (aralik > 1) return Math.floor(aralik) + " gün önce";
    aralik = farkSaniye / 3600;
    if (aralik > 1) return Math.floor(aralik) + " saat önce";
    aralik = farkSaniye / 60;
    if (aralik > 1) return Math.floor(aralik) + " dakika önce";
    return "az önce";
}

export default async function EtkinliklerPage({ params }: { params: { firmaId: string } }) {
    const supabase = createSupabaseServerClient();

    // Paralel olarak hem etkinlikleri hem de mevcut kullanıcıyı çekiyoruz
    const [etkinliklerRes, userRes] = await Promise.all([
        supabase
            .from('etkinlikler')
            .select(`*, olusturan_personel: profiller!olusturan_personel_id ( tam_ad )`)
            .eq('firma_id', params.firmaId)
            .order('created_at', { ascending: false }),
        supabase.auth.getUser()
    ]);
    
    const { data: etkinlikler, error } = etkinliklerRes;
    const { data: { user } } = userRes;

    if (error) {
        console.error("Etkinlikler çekilirken hata:", error);
        return <div>Etkinlikler yüklenemedi.</div>;
    }

    const etkinlikTipleri: EtkinlikTipi[] = ['Not', 'Telefon Görüşmesi', 'Toplantı', 'E-posta', 'Teklif'];
    const formActionWithId = yeniEtkinlikEkleAction.bind(null, params.firmaId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sol Taraf: Yeni Etkinlik Ekleme Formu */}
            <div className="lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Yeni Etkinlik Ekle</h2>
                <form action={formActionWithId} className="space-y-4 p-4 bg-secondary/50 rounded-lg border">
                    <div>
                        <label htmlFor="etkinlik_tipi" className="block text-sm font-bold text-text-main/80 mb-2">Etkinlik Tipi</label>
                        <select
                            id="etkinlik_tipi"
                            name="etkinlik_tipi"
                            required
                            className="w-full bg-white border border-bg-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent"
                        >
                            {etkinlikTipleri.map(tip => <option key={tip} value={tip}>{tip}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="aciklama" className="block text-sm font-bold text-text-main/80 mb-2">Açıklama / Not</label>
                        <textarea
                            id="aciklama"
                            name="aciklama"
                            rows={5}
                            required
                            placeholder="Görüşme detaylarını veya notunuzu buraya yazın..."
                            className="w-full bg-white border border-bg-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm"
                        >
                            <FiSend size={16} /> Ekle
                        </button>
                    </div>
                </form>
            </div>

            {/* Sağ Taraf: Etkinlik Akışı Listesi */}
            <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Etkinlik Geçmişi</h2>
                <div className="space-y-6">
                    {etkinlikler && etkinlikler.length > 0 ? (
                        etkinlikler.map(etkinlik => {
                            const zamanFarki = zamanFarkiFormatla(etkinlik.created_at);

                            return (
                                <EtkinlikKarti 
                                    key={etkinlik.id}
                                    etkinlik={etkinlik as any}
                                    zamanFarki={zamanFarki}
                                    ikonAdi={etkinlik.etkinlik_tipi}
                                    currentUser={user}
                                />
                            );
                        })
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg">
                            <p className="text-text-main/70">Bu firma için henüz bir etkinlik kaydedilmemiş.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
