// src/app/portal/siparislerim/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Enums } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { FiPackage } from 'react-icons/fi';

type SiparisStatus = Enums<'siparis_durumu'>;
const STATUS_RENKLERI: Record<SiparisStatus, string> = {
    "Beklemede": "bg-gray-100 text-gray-800",
    "Hazırlanıyor": "bg-blue-100 text-blue-800",
    "Yola Çıktı": "bg-yellow-100 text-yellow-800",
    "Teslim Edildi": "bg-green-100 text-green-800",
    "İptal Edildi": "bg-red-100 text-red-800"
};
const formatFiyat = (fiyat: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(fiyat);
const formatDate = (tarih: string) => new Date(tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

export default async function PartnerSiparisListPage() {
    const supabase = createSupabaseServerClient();
    const { data: siparisler, error } = await supabase
        .from('siparisler')
        .select('id, siparis_tarihi, toplam_tutar, siparis_statusu')
        .order('siparis_tarihi', { ascending: false });

    if (error) {
        console.error("Partner siparişleri çekilirken hata:", error);
        return <div className="p-6 text-red-500">Siparişleriniz yüklenirken bir hata oluştu.</div>;
    }
    
    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Siparişlerim</h1>
                <p className="text-text-main/80 mt-1">Tüm geçmiş ve mevcut siparişlerinizi buradan takip edebilirsiniz.</p>
            </header>
            <div className="bg-white rounded-lg shadow-md divide-y divide-bg-subtle">
                {siparisler.length === 0 ? (
                     <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-4">
                        <FiPackage size={40} className="text-gray-300"/>
                        <span>Henüz hiç siparişiniz bulunmuyor.</span>
                    </div>
                ) : (
                    siparisler.map(siparis => (
                        <Link key={siparis.id} href={`/portal/siparislerim/${siparis.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-mono text-accent font-bold">#{String(siparis.id).padStart(6, '0')}</p>
                                    <p className="text-sm text-gray-500">{formatDate(siparis.siparis_tarihi)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-primary">{formatFiyat(siparis.toplam_tutar)}</p>
                                    <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_RENKLERI[siparis.siparis_statusu]}`}>
                                        {siparis.siparis_statusu}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}