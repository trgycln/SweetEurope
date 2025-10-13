// src/app/admin/crm/firmalar/[firmaId]/etkinlikler/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Enums } from '@/lib/supabase/database.types';
import { FiMessageSquare, FiPhone, FiUsers, FiClipboard, FiFileText, FiSend } from 'react-icons/fi';
import { yeniEtkinlikEkleAction } from './actions';
import { toast } from 'sonner'; // 'sonner' zaten projenizde var.

type EtkinlikTipi = Enums<'etkinlik_tipi'>;

// Etkinlik tiplerine göre ikon ve renk belirleyen bir harita
const etkinlikIkonlari: Record<EtkinlikTipi, React.ElementType> = {
    'Not': FiMessageSquare,
    'Telefon Görüşmesi': FiPhone,
    'Toplantı': FiUsers,
    'E-posta': FiFileText,
    'Teklif': FiClipboard,
};

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

    // Etkinlikleri ve oluşturan personelin adını birlikte çekiyoruz
    const { data: etkinlikler, error } = await supabase
        .from('etkinlikler')
        .select(`
            id,
            created_at,
            etkinlik_tipi,
            aciklama,
            profiller ( tam_ad )
        `)
        .eq('firma_id', params.firmaId)
        .order('created_at', { ascending: false }); // En yeni en üstte

    if (error) {
        console.error("Etkinlikler çekilirken hata:", error);
        return <div>Etkinlikler yüklenemedi.</div>
    }

    const etkinlikTipleri: EtkinlikTipi[] = ['Not', 'Telefon Görüşmesi', 'Toplantı', 'E-posta', 'Teklif'];

    // Server Action'ı firmaId ile bağlamak için .bind() kullanıyoruz.
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
                            const Icon = etkinlikIkonlari[etkinlik.etkinlik_tipi] || FiMessageSquare;
                            // @ts-ignore - Supabase'in oluşturduğu tiplerde ilişki bazen tam yansımayabilir.
                            const personelAdi = etkinlik.profiller?.tam_ad || 'Bilinmeyen Kullanıcı';

                            return (
                                <div key={etkinlik.id} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <span className="flex items-center justify-center w-10 h-10 bg-bg-subtle rounded-full">
                                            <Icon className="text-accent" />
                                        </span>
                                        <div className="w-px h-full bg-bg-subtle"></div>
                                    </div>
                                    <div className="flex-1 pb-6">
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-primary">{etkinlik.etkinlik_tipi}</p>
                                            <p className="text-xs text-text-main/60">{zamanFarkiFormatla(etkinlik.created_at)}</p>
                                        </div>
                                        <p className="text-sm text-text-main/80 mt-1">
                                            <span className="font-semibold">{personelAdi}</span> tarafından oluşturuldu.
                                        </p>
                                        <p className="mt-2 p-3 bg-secondary/50 rounded-md text-text-main text-sm whitespace-pre-wrap">{etkinlik.aciklama}</p>
                                    </div>
                                </div>
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