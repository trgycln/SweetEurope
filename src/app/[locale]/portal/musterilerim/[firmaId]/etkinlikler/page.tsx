import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { FiSend } from 'react-icons/fi';
import { yeniEtkinlikEkleAction } from '../actions';
import EtkinlikKarti from './EtkinlikKarti';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';

type EtkinlikTipi = Enums<'etkinlik_tipi'>;

type EtkinlikWithProfile = Tables<'etkinlikler'> & {
    olusturan_personel: {
        tam_ad: string | null;
    } | null;
};

function zamanFarkiFormatla(tarihStr: string | null): string {
    if (!tarihStr) return '';
    const tarih = new Date(tarihStr);
    const simdi = new Date();
    if (isNaN(tarih.getTime())) return '';

    const farkSaniye = Math.floor((simdi.getTime() - tarih.getTime()) / 1000);

    if (farkSaniye < 60) return "az önce";
    let aralik = Math.floor(farkSaniye / 60);
    if (aralik < 60) return aralik + " dakika önce";
    aralik = Math.floor(farkSaniye / 3600);
    if (aralik < 24) return aralik + " saat önce";
    aralik = Math.floor(farkSaniye / 86400);
    if (aralik < 30) return aralik + " gün önce";
    aralik = Math.floor(farkSaniye / 2592000);
    if (aralik < 12) return aralik + " ay önce";
    aralik = Math.floor(farkSaniye / 31536000);
    return aralik + " yıl önce";
}

interface EtkinliklerPageProps {
    params: {
        locale: Locale;
        firmaId: string;
    };
}

export default async function EtkinliklerPage({ params }: EtkinliklerPageProps) {
    const { firmaId, locale } = params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div className="p-6 text-red-500">Oturum bulunamadı.</div>;

    const { data: etkinlikler, error: etkinliklerError } = await supabase
        .from('etkinlikler')
        .select(`*, olusturan_personel: profiller!etkinlikler_olusturan_personel_id_fkey( tam_ad )`)
        .eq('firma_id', firmaId)
        .order('created_at', { ascending: false });

    if (etkinliklerError) {
        console.error("Etkinlikler yüklenirken hata:", etkinliklerError);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Etkinlikler yüklenemedi. Hata: {etkinliklerError.message}</div>;
    }

    const etkinlikListesi: EtkinlikWithProfile[] = etkinlikler || [];

    const etkinlikTipleri: EtkinlikTipi[] = ['Not', 'Telefon Görüşmesi', 'Toplantı', 'E-posta', 'Teklif'];

    async function handleAddEtkinlik(formData: FormData) {
        'use server';
        await yeniEtkinlikEkleAction(firmaId, formData);
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Yeni Etkinlik Ekle</h2>
                <form action={handleAddEtkinlik} className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                        <label htmlFor="etkinlik_tipi" className="block text-sm font-bold text-gray-700 mb-1">Etkinlik Tipi</label>
                        <select
                            id="etkinlik_tipi"
                            name="etkinlik_tipi"
                            required
                            className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                        >
                            {etkinlikTipleri.map(tip => <option key={tip} value={tip}>{tip}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="aciklama" className="block text-sm font-bold text-gray-700 mb-1">Açıklama / Not</label>
                        <textarea
                            id="aciklama"
                            name="aciklama"
                            rows={5}
                            required
                            placeholder="Görüşme detayları veya notunuzu buraya yazın..."
                            className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm transition disabled:opacity-50"
                        >
                            <FiSend size={16} /> Ekle
                        </button>
                    </div>
                </form>
            </div>

            <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Etkinlik Akışı</h2>
                <div className="space-y-6">
                    {etkinlikListesi.length > 0 ? (
                        etkinlikListesi.map(etkinlik => {
                            const zamanFarki = zamanFarkiFormatla(etkinlik.created_at);
                            return (
                                <EtkinlikKarti
                                    key={etkinlik.id}
                                    etkinlik={etkinlik as EtkinlikWithProfile}
                                    zamanFarki={zamanFarki}
                                    ikonAdi={etkinlik.etkinlik_tipi}
                                    currentUser={user}
                                />
                            );
                        })
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                            <p className="text-gray-500">Bu müşteri için henüz etkinlik kaydı yapılmadı.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
