// src/components/portal/dashboard/RecentOrders.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';

// Sipariş durumuna göre renk döndüren yardımcı fonksiyon
const getStatusChip = (status: string) => {
    switch (status) {
        case 'Teslim Edildi': return 'bg-green-100 text-green-800';
        case 'Yola Çıktı': return 'bg-blue-100 text-blue-800';
        case 'Hazırlanıyor': return 'bg-yellow-100 text-yellow-800';
        case 'İptal Edildi': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

export async function RecentOrders({ firmaId, locale }: { firmaId: string; locale: Locale }) {
    const dictionary = await getDictionary(locale);
    const content = dictionary.portal.dashboard;
    const supabase = createSupabaseServerClient();

    const { data: orders, error } = await supabase
        .from('siparisler')
        .select('id, siparis_tarihi, toplam_tutar_net, siparis_durumu')
        .eq('firma_id', firmaId)
        .order('siparis_tarihi', { ascending: false })
        .limit(5);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-2xl font-bold text-primary">{content.recentOrdersTitle}</h2>
                <Link href={`/${locale}/portal/siparislerim`} className="text-sm font-semibold text-accent hover:underline flex items-center gap-1">
                    {content.viewAll} <FiArrowRight />
                </Link>
            </div>
            
            {orders && orders.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-xs text-text-main/60 uppercase">
                            <tr>
                                <th className="p-3">ID</th>
                                <th className="p-3">{content.orderDate}</th>
                                <th className="p-3">{content.totalAmount}</th>
                                <th className="p-3">{content.status}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id} className="border-t border-bg-subtle">
                                    <td className="p-3 font-mono text-sm">#{order.id.substring(0, 8)}...</td>
                                    <td className="p-3 text-sm">{new Date(order.siparis_tarihi).toLocaleDateString(locale)}</td>
                                    <td className="p-3 text-sm font-semibold">€{order.toplam_tutar_net.toFixed(2)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusChip(order.siparis_durumu)}`}>
                                            {order.siparis_durumu}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                 <p className="text-text-main/70 py-8 text-center">{content.noOrders}</p>
            )}
        </div>
    );
}