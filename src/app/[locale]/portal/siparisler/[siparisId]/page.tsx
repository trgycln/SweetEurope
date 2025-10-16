import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiUser, FiTruck } from "react-icons/fi";
import { PartnerOrderActions } from "@/components/portal/partner-order-actions";
import { getDictionary } from "@/dictionaries";
import { Locale } from "@/i18n-config";
import { Tables } from "@/lib/supabase/database.types";

export default async function PartnerSiparisDetayPage({ params }: { params: { siparisId: string, locale: Locale } }) {
    const dictionary = await getDictionary(params.locale);
    const content = dictionary.portal.orderDetailsPage;
    const supabase = createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }
    
    // YAZIM HATASI BURADA DÜZELTİLDİ: Fazladan '}' kaldırıldı.
    const { data: profile } = await supabase.from('profiller').select('firma_id').eq('id', user.id).single();
    if (!profile || !profile.firma_id) {
        return notFound();
    }

    const { data: siparis, error } = await supabase
        .from('siparisler')
        .select(`
            *,
            firmalar (unvan, adres),
            siparis_detay (
                id,
                urun_id, 
                birim_fiyat, 
                toplam_fiyat,
                miktar, 
                urunler(ad, stok_kodu)
            ),
            faturalar (id, dosya_url) 
        `)
        .eq('id', params.siparisId)
        .eq('firma_id', profile.firma_id)
        .single();
    
    if (error || !siparis) {
        console.error("Sipariş detayı çekme hatası:", error);
        return notFound();
    }
    
    const orderDetails = siparis.siparis_detay as (Tables<'siparis_detay'> & { urunler: Pick<Tables<'urunler'>, 'ad' | 'stok_kodu'> | null })[];
    
    const formatFiyat = (fiyat: number) => new Intl.NumberFormat(params.locale, { style: 'currency', currency: 'EUR' }).format(fiyat);
    const formatDate = (tarih: string) => new Date(tarih).toLocaleString(params.locale, { dateStyle: 'long', timeStyle: 'short' });

    return (
        <div className="space-y-8">
            <header>
                <Link href={`/${params.locale}/portal/siparisler`} className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent">
                    <FiArrowLeft /> {content.backToList}
                </Link>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start mt-4 gap-4">
                    <div>
                        <h1 className="font-serif text-4xl font-bold text-primary">{content.title} #{siparis.id.substring(0, 8).toUpperCase()}</h1>
                        <p className="text-text-main/60">{content.creationDate}: {formatDate(siparis.siparis_tarihi)}</p>
                    </div>
                    <PartnerOrderActions siparis={siparis as any} />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-6">
                 <h2 className="font-serif text-2xl font-bold text-primary border-b pb-4">{content.orderItems}</h2>
                 <table className="w-full text-sm">
                   <thead className="border-b">
                     <tr>
                       <th className="text-left py-2 font-bold text-text-main/60 uppercase">{content.product}</th>
                       <th className="text-right py-2 font-bold text-text-main/60 uppercase">{content.quantity}</th>
                       <th className="text-right py-2 font-bold text-text-main/60 uppercase">{content.unitPrice}</th>
                       <th className="text-right py-2 font-bold text-text-main/60 uppercase">{content.lineTotal}</th>
                     </tr>
                   </thead>
                   <tbody>
                     {orderDetails.map(item => (
                       <tr key={item.id} className="border-b">
                         <td className="py-4">
                           <p className="font-bold text-primary">{(item.urunler?.ad as any)?.[params.locale] || 'Ürün Adı Bulunamadı'}</p>
                           <p className="font-mono text-xs text-text-main/50">{item.urunler?.stok_kodu}</p>
                         </td>
                         <td className="py-4 text-right">{item.miktar}</td>
                         <td className="py-4 text-right">{formatFiyat(item.birim_fiyat)}</td>
                         <td className="py-4 text-right font-semibold">{formatFiyat(item.toplam_fiyat)}</td>
                       </tr>
                     ))}
                   </tbody>
                   <tfoot className="font-bold text-primary">
                     <tr>
                       <td colSpan={3} className="text-right py-4">{content.subtotal}</td>
                       <td className="text-right py-4">{formatFiyat(siparis.toplam_tutar_net)}</td>
                     </tr>
                      <tr>
                       <td colSpan={3} className="text-right py-2">{content.vat} ({siparis.kdv_orani}%)</td>
                       <td className="text-right py-2">{formatFiyat(siparis.toplam_tutar_brut - siparis.toplam_tutar_net)}</td>
                     </tr>
                      <tr className="text-xl">
                       <td colSpan={3} className="text-right py-4 border-t-2">{content.grandTotal}</td>
                       <td className="text-right py-4 border-t-2">{formatFiyat(siparis.toplam_tutar_brut)}</td>
                     </tr>
                   </tfoot>
                 </table>
               </div>
               <div className="space-y-6">
                 <div className="bg-white p-6 rounded-2xl shadow-lg">
                   <h3 className="font-serif text-xl font-bold text-primary mb-4 flex items-center gap-2"><FiUser/>{content.customerInfo}</h3>
                   <p className="font-bold text-accent">{(siparis.firmalar as any)?.unvan}</p>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-lg">
                   <h3 className="font-serif text-xl font-bold text-primary mb-4 flex items-center gap-2"><FiTruck/>{content.deliveryInfo}</h3>
                   <p className="text-sm text-text-main/80 whitespace-pre-wrap">{siparis.teslimat_adresi || (siparis.firmalar as any)?.adres}</p>
                 </div>
               </div>
             </div>
        </div>
    );
}