// src/app/admin/crm/firmalar/[firmaId]/siparisler/page.tsx (GÜNCELLENMİŞ HALİ)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiDollarSign, FiCheckCircle, FiClock, FiTruck, FiXCircle } from 'react-icons/fi';

type SiparisStatus = 'Hazırlanıyor' | 'Yola Çıktı' | 'Teslim Edildi' | 'İptal Edildi' | string;

const STATUS_MAP: Record<SiparisStatus, { text: string; color: string; icon: React.ElementType }> = {
    'Hazırlanıyor': { text: 'Hazırlanıyor', color: 'text-yellow-600 bg-yellow-100', icon: FiClock },
    'Yola Çıktı': { text: 'Yola Çıktı', color: 'text-blue-600 bg-blue-100', icon: FiTruck },
    'Teslim Edildi': { text: 'Teslim Edildi', color: 'text-green-600 bg-green-100', icon: FiCheckCircle },
    'İptal Edildi': { text: 'İptal Edildi', color: 'text-red-600 bg-red-100', icon: FiXCircle },
};

export default async function FirmaSiparisleriPage({ params }: { params: { firmaId: string } }) {
    const supabase = createSupabaseServerClient();

    const { data: siparisler, error } = await supabase
        .from('siparisler')
        .select('*')
        .eq('firma_id', params.firmaId)
        .order('siparis_tarihi', { ascending: false });

    if (error) {
        console.error("Siparişler çekilirken hata:", error);
        return <div>Sipariş bilgileri yüklenirken bir sorun oluştu.</div>;
    }
    
    const formatCurrency = (amount: number | null) => {
        if (amount === null) return 'N/A';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };
    
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div>
            <h2 className="font-serif text-2xl font-bold text-primary mb-6">Sipariş Geçmişi</h2>
            
            {siparisler && siparisler.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-bg-subtle">
                        <thead className="bg-secondary/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase">Sipariş No</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase">Sipariş Tarihi</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase">Brüt Tutar</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-bg-subtle">
                            {siparisler.map(siparis => {
                                const statusInfo = STATUS_MAP[siparis.siparis_durumu as SiparisStatus] || { text: siparis.siparis_durumu || 'Bilinmiyor', color: 'text-gray-600 bg-gray-100', icon: FiPackage };
                                const StatusIcon = statusInfo.icon;
                                
                                return (
                                    <tr key={siparis.id} className="hover:bg-secondary/30 transition-colors">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {/* GÜNCELLEME: Link artık dinamik detay sayfasına yönlendiriyor */}
                                            <Link 
                                                href={`/admin/crm/firmalar/${params.firmaId}/siparisler/${siparis.id}`} 
                                                className="font-bold text-accent hover:underline"
                                            >
                                                #{siparis.id.substring(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-main">
                                            <FiCalendar className="inline mr-2 -mt-1 text-gray-400" />
                                            {formatDate(siparis.siparis_tarihi)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-main font-semibold">
                                            <FiDollarSign className="inline mr-1 -mt-1 text-gray-400" />
                                            {formatCurrency(siparis.toplam_tutar_brut)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                                                <StatusIcon />
                                                {statusInfo.text}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    <FiPackage className="mx-auto text-5xl text-gray-300 mb-4" />
                    <p className="text-text-main/70">Bu firma için henüz bir sipariş kaydı bulunmuyor.</p>
                </div>
            )}
        </div>
    );
}