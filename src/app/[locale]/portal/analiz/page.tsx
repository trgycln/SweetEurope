// src/app/portal/analiz/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';
import { notFound } from "next/navigation";
import { FiBarChart2, FiSlash, FiStar } from "react-icons/fi";
import { SalesTrendChart, TopCategoriesChart } from "@/components/portal/analiz-charts";

// Hilfsfunktion für Datumsbereich
const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // Letzte 3 Monate
    return { 
        start: startDate.toISOString().split('T')[0], 
        end: endDate.toISOString().split('T')[0] 
    };
};

export default async function AnalysePage() {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return notFound();

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'Alt Bayi') {
        return <div className="p-8 text-center"><FiSlash className="mx-auto text-5xl"/><h1 className="mt-4">Zugriff verweigert</h1></div>;
    }

    const { data: firma } = await supabase.from('firmalar').select('id').eq('portal_kullanicisi_id', user.id).single();
    if (!firma) return <div>Firmanız bulunamadı.</div>;

    const { start, end } = getDateRange();
    const { data: report, error } = await supabase.rpc('get_subdealer_performance_report', { 
        p_firma_id: firma.id, 
        start_date: start, 
        end_date: end 
    }).single();
    
    if (error || !report) {
        console.error("Analyse-Bericht Fehler:", error);
        return <div>Rapor verileri yüklenemedi.</div>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Performans Panelim</h1>
                <p className="text-text-main/80 mt-1">Son 3 aydaki satış performansınızın özeti.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="font-serif text-2xl font-bold text-primary mb-4">En Popüler Kategoriler (Ciro Bazında)</h2>
                    <TopCategoriesChart data={report.topCategories} />
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="font-serif text-2xl font-bold text-primary mb-4">Satış Trendi</h2>
                    <SalesTrendChart data={report.salesTrend} />
                </div>
            </div>
             <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">En Çok Satan Ürünler (Adet Bazında)</h2>
                <ul className="space-y-3">
                    {(report.topProducts as any[]).map((p, i) => (
                        <li key={i} className="flex justify-between items-center text-sm border-b pb-2">
                            <span className="font-bold text-primary">{p.urun_adi}</span>
                            <span className="font-semibold text-accent">{p.total_adet} adet</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}