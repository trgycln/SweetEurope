// src/app/admin/operasyon/siparisler/[siparisId]/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiUser, FiTruck, FiHome } from 'react-icons/fi';
import DurumGuncellePaneli from './DurumGuncellePaneli';

// Yardımcı fonksiyonlar
const formatCurrency = (amount: number | null) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount || 0);
const formatDate = (dateStr: string | null) => new Date(dateStr || 0).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function OperasyonSiparisDetayPage({ params }: { params: { siparisId: string } }) {
    const supabase = createSupabaseServerClient();

    // Tek bir sorgu ile sipariş, firma ve sipariş detaylarını (ürün isimleriyle birlikte) çekiyoruz
    const { data: siparis, error } = await supabase
        .from('siparisler')
        .select(`
            *,
            firma: firmalar!firma_id ( unvan, adres ),
            siparis_detay (
                *,
                urun: urunler ( ad )
            )
        `)
        .eq('id', params.siparisId)
        .single();

    if (error || !siparis) {
        console.error("Operasyonel Sipariş Detayı Hatası:", error);
        notFound();
    }
    
    // @ts-ignore
    const urunSatirlari = siparis.siparis_detay || [];

    return (
        <div className="space-y-6">
            <Link 
                href="/admin/operasyon/siparisler" 
                className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors"
            >
                <FiArrowLeft />
                Tüm Siparişlere Geri Dön
            </Link>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">Sipariş Detayı</h1>
                    <p className="text-text-main/60 font-mono">#{siparis.id.substring(0, 8).toUpperCase()}</p>
                </div>
                {/* YENİ: İnteraktif durum güncelleme paneli */}
                <DurumGuncellePaneli siparisId={siparis.id} mevcutDurum={siparis.siparis_durumu as any} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sol Taraf: Sipariş Kalemleri */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="font-serif text-xl font-bold text-primary border-b pb-3 mb-3">Sipariş İçeriği</h2>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="py-2 text-left text-xs font-bold text-text-main/60 uppercase">Ürün</th>
                                <th className="py-2 text-right text-xs font-bold text-text-main/60 uppercase">Adet</th>
                                <th className="py-2 text-right text-xs font-bold text-text-main/60 uppercase">Birim Fiyat</th>
                                <th className="py-2 text-right text-xs font-bold text-text-main/60 uppercase">Satır Toplamı</th>
                            </tr>
                        </thead>
                        <tbody>
                            {urunSatirlari.map((item: any) => (
                                <tr key={item.id} className="border-b last:border-none">
                                    {/* @ts-ignore */}
                                    <td className="py-3 font-semibold text-text-main">{item.urun?.ad?.['tr'] || 'Ürün Adı Bulunamadı'}</td>
                                    <td className="py-3 text-right">{item.miktar}</td>
                                    <td className="py-3 text-right">{formatCurrency(item.birim_fiyat)}</td>
                                    <td className="py-3 text-right font-bold">{formatCurrency(item.toplam_fiyat)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Sağ Taraf: Özet Bilgiler */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="font-serif text-lg font-bold text-primary mb-4 flex items-center gap-2"><FiUser/>Müşteri</h3>
                        {/* @ts-ignore */}
                        <p className="font-bold text-accent">{siparis.firma?.unvan}</p>
                        <p className="text-sm text-text-main/80 mt-1 flex items-start gap-2">
                            <FiHome className="mt-1 flex-shrink-0"/> 
                            {/* @ts-ignore */}
                            <span>{siparis.firma?.adres || 'Adres belirtilmemiş'}</span>
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="font-serif text-lg font-bold text-primary mb-4 flex items-center gap-2"><FiTruck/>Teslimat Adresi</h3>
                        <p className="text-sm text-text-main/80 whitespace-pre-wrap">{siparis.teslimat_adresi}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                         <h3 className="font-serif text-lg font-bold text-primary mb-4">Sipariş Toplamı</h3>
                         <div className="space-y-2 text-sm">
                             <div className="flex justify-between"><span className="text-text-main/80">Ara Toplam (Net)</span><span className="font-semibold">{formatCurrency(siparis.toplam_tutar_net)}</span></div>
                             <div className="flex justify-between"><span className="text-text-main/80">KDV (%{siparis.kdv_orani})</span><span className="font-semibold">{formatCurrency((siparis.toplam_tutar_brut || 0) - (siparis.toplam_tutar_net || 0))}</span></div>
                             <div className="flex justify-between text-base font-bold text-primary pt-2 border-t"><span >Genel Toplam</span><span>{formatCurrency(siparis.toplam_tutar_brut)}</span></div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
}