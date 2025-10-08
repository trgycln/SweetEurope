import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FiBox, FiPlus } from "react-icons/fi";
import Link from "next/link";
import { dictionary } from '@/dictionaries/de'; // Wörterbuch importieren

export default async function PartnerDashboardPage() {
    const supabase = createSupabaseServerClient();
    const content = dictionary.portal.dashboard; // Texte für das Dashboard holen

    const { data: { user } } = await supabase.auth.getUser();

    const { data: firma } = await supabase
        .from('firmalar')
        .select('unvan, id')
        .eq('portal_kullanicisi_id', user!.id)
        .single();
    
    const letzteSiparisler = [];

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.welcome}{firma?.unvan}!</h1>
                <p className="text-text-main/80 mt-1">{content.subtitle}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                    <Link href={`/portal/siparisler/yeni?firmaId=${firma?.id}`} className="block w-full p-6 bg-green-600 text-white text-center rounded-lg shadow-lg hover:bg-green-700 transition-colors">
                        <h2 className="text-2xl font-bold flex items-center justify-center gap-2"><FiPlus /> {content.newOrderButton}</h2>
                    </Link>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="font-serif text-xl font-bold text-primary">{content.announcementsTitle}</h3>
                        <p className="text-sm text-text-main/70 mt-2">{content.announcementsPlaceholder}</p>
                    </div>
                </div>

                <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="font-serif text-2xl font-bold text-primary mb-4">{content.recentOrdersTitle}</h2>
                    {letzteSiparisler.length === 0 ? (
                        <p className="text-text-main/70">{content.noOrders}</p>
                    ) : (
                        <p>{content.ordersPlaceholder}</p>
                    )}
                </div>
            </div>
        </div>
    );
}