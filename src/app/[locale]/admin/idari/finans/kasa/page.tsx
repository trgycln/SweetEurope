import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import KasaClient from './KasaClient';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiActivity } from 'react-icons/fi';

export const dynamic = 'force-dynamic';

export default async function KasaPage() {
    const cookieStore = await cookies();
    const supabase: any = await createSupabaseServerClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    const isSuperAdmin = user?.email === 'turgaycelen03@gmail.com';

    // İşlemleri getir
    const { data: islemler } = await supabase
        .from('finans_kasa_islemleri')
        .select('*')
        .order('tarih', { ascending: false });

    // Ortaklari getir (sermaye işlemleri için)
    const { data: profiller } = await supabase
        .from('profiller')
        .select('id, tam_ad, rol');

    const ortakProfiller = (profiller || []).filter((p: any) => (p.rol as string) === 'Yönetici' || (p.rol as string) === 'Kurucu' || (p.rol as string) === 'Ortak');

    // Özeti getir
    const { data: ozetData } = await supabase.rpc('get_kasa_ozeti');
    const ozet = ozetData?.[0] || {
        banka_bakiye: 0,
        nakit_bakiye: 0
    };

    const genelKalan = (ozet.banka_bakiye || 0) + (ozet.nakit_bakiye || 0);

    const stats = [
        { title: 'Genel Kasa (Banka + Nakit)', value: genelKalan, icon: FiActivity, bg: 'bg-indigo-100', color: 'text-indigo-600' },
        { title: 'Banka Hesabı', value: ozet.banka_bakiye || 0, icon: FiDollarSign, bg: 'bg-blue-100', color: 'text-blue-600' },
        { title: 'Nakit Kasa', value: ozet.nakit_bakiye || 0, icon: FiDollarSign, bg: 'bg-emerald-100', color: 'text-emerald-600' },
    ];

    return (
        <main className="p-6 space-y-8 bg-slate-50 min-h-screen">
            {/* Ozet Kartlari */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                <h3 className={`text-2xl font-bold ${stat.value < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                    €{stat.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <KasaClient islemler={(islemler as any) || []} profiller={ortakProfiller} isSuperAdmin={isSuperAdmin} />
        </main>
    );
}
