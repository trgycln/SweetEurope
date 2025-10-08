// src/app/portal/siparislerim/[siparisId]/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiUser, FiTruck, FiHash, FiCalendar, FiFileText } from "react-icons/fi";
import { PartnerOrderActions } from "@/components/portal/partner-order-actions";

const formatFiyat = (fiyat: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(fiyat);
const formatDate = (tarih: string) => new Date(tarih).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' });

export default async function PartnerSiparisDetayPage({ params }: { params: { siparisId: string } }) {
    const supabase = createSupabaseServerClient();
    const siparisId = parseInt(params.siparisId, 10);

    // RLS, partnerin sadece kendi sipariş detayını görmesini sağlar.
    const { data: siparis, error } = await supabase.from('siparisler')
        .select(`
            *,
            firmalar (unvan, adres),
            siparis_detaylari (*, urunler(urun_adi, urun_kodu))
        `)
        .eq('id', siparisId)
        .single();
    
    if (error || !siparis) return notFound();
    
    return (
        <div className="space-y-8">
            <header>
                <Link href="/portal/siparislerim" className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent">
                    <FiArrowLeft /> Sipariş Listesine Geri Dön
                </Link>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start mt-4 gap-4">
                    <div>
                        <h1 className="font-serif text-4xl font-bold text-primary">Sipariş #{String(siparis.id).padStart(6, '0')}</h1>
                        <p className="text-text-main/60">Oluşturulma Tarihi: {formatDate(siparis.siparis_tarihi)}</p>
                    </div>
                    {/* Interaktif Butonlar Client Component'ten gelecek */}
                    <PartnerOrderActions siparis={siparis as any} />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-6">
                    <h2 className="font-serif text-2xl font-bold text-primary border-b pb-4">Sipariş Kalemleri</h2>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2 font-bold text-text-main/60 uppercase">Ürün</th>
                                <th className="text-right py-2 font-bold text-text-main/60 uppercase">Adet</th>
                                <th className="text-right py-2 font-bold text-text-main/60 uppercase">Birim Fiyat</th>
                                <th className="text-right py-2 font-bold text-text-main/60 uppercase">Satır Toplamı</th>
                            </tr>
                        </thead>
                        <tbody>
                            {siparis.siparis_detaylari.map(item => (
                                <tr key={item.id} className="border-b">
                                    <td className="py-4">
                                        <p className="font-bold text-primary">{item.urunler?.urun_adi}</p>
                                        <p className="font-mono text-xs text-text-main/50">{item.urunler?.urun_kodu}</p>
                                    </td>
                                    <td className="py-4 text-right">{item.adet}</td>
                                    <td className="py-4 text-right">{formatFiyat(item.o_anki_satis_fiyati)}</td>
                                    <td className="py-4 text-right font-semibold">{formatFiyat(item.adet * item.o_anki_satis_fiyati)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold text-primary">
                                <td colSpan={3} className="text-right py-4">GENEL TOPLAM</td>
                                <td className="text-right py-4 text-xl">{formatFiyat(siparis.toplam_tutar)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="font-serif text-xl font-bold text-primary mb-4 flex items-center gap-2"><FiUser/>Müşteri Bilgileri</h3>
                        <p className="font-bold text-accent">{siparis.firmalar?.unvan}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="font-serif text-xl font-bold text-primary mb-4 flex items-center gap-2"><FiTruck/>Teslimat Bilgileri</h3>
                        <p className="text-sm text-text-main/80 whitespace-pre-wrap">{siparis.teslimat_adresi || siparis.firmalar?.adres}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}