// src/app/[locale]/admin/idari/finans/raporlama/page.tsx
// Ana Finansal Raporlama Dashboard

export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { 
    FiBarChart2, 
    FiDollarSign, 
    FiTrendingDown, 
    FiTrendingUp, 
    FiSlash, 
    FiPieChart,
    FiActivity,
    FiArrowRight,
    FiShoppingCart,
    FiCreditCard,
    FiAlertCircle
} from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';
import { redirect } from 'next/navigation';

// ReportData Typ
type QuickStats = {
    totalGrossRevenue: number;
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    expenseBreakdown: { kategori: string; toplam: number }[];
};

// Währungsformatierung
const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

// KPI Kart Komponenti
const KPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue,
    bgColor = 'bg-white',
    iconBgColor = 'bg-primary/10',
    iconColor = 'text-primary',
    textColor = 'text-primary',
    borderColor = 'border-gray-200'
}: { 
    title: string; 
    value: string; 
    icon: any; 
    trend?: 'up' | 'down';
    trendValue?: string;
    bgColor?: string;
    iconBgColor?: string;
    iconColor?: string;
    textColor?: string;
    borderColor?: string;
}) => (
    <div className={`${bgColor} p-6 rounded-2xl shadow-lg border-2 ${borderColor} hover:shadow-xl transition-all`}>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
                {trend && trendValue && (
                    <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {trend === 'up' ? <FiTrendingUp size={16} /> : <FiTrendingDown size={16} />}
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>
            <div className={`p-3 ${iconBgColor} rounded-xl`}>
                <Icon className={iconColor} size={24} />
            </div>
        </div>
    </div>
);

// Rapor Kartı Komponenti
const ReportCard = ({ 
    title, 
    description, 
    icon: Icon, 
    href,
    color = 'primary'
}: { 
    title: string; 
    description: string; 
    icon: any; 
    href: string;
    color?: string;
}) => {
    const colorClasses = {
        primary: 'bg-primary/5 border-primary/20 hover:bg-primary/10',
        accent: 'bg-accent/5 border-accent/20 hover:bg-accent/10',
        green: 'bg-green-50 border-green-200 hover:bg-green-100',
        blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    }[color] || 'bg-gray-50 border-gray-200 hover:bg-gray-100';

    return (
        <Link href={href}>
            <div className={`${colorClasses} p-6 rounded-2xl border-2 transition-all cursor-pointer group h-full`}>
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${color === 'primary' ? 'bg-primary/10' : color === 'accent' ? 'bg-accent/10' : color === 'green' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        <Icon className={color === 'primary' ? 'text-primary' : color === 'accent' ? 'text-accent' : color === 'green' ? 'text-green-600' : 'text-blue-600'} size={28} />
                    </div>
                    <FiArrowRight className="text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" size={20} />
                </div>
                <h3 className="font-serif text-xl font-bold text-primary mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
            </div>
        </Link>
    );
};

// Hauptkomponente
export default async function FinancialReportsDashboard({
    params: { locale }
}: {
    params: { locale: Locale };
}) {
    const cookieStore = await cookies(); 
    const supabase = await createSupabaseServerClient(cookieStore); 

    const dictionary = await getDictionary(locale);
    
    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user!.id).single();
    if (profile?.rol !== 'Yönetici') {
        return (
            <div className="p-8 text-center">
                <FiSlash className="mx-auto text-5xl text-red-500"/>
                <h1 className="font-serif mt-4 text-2xl text-red-600">Zugriff verweigert</h1>
            </div>
        );
    }

    // Bu ayın hızlı istatistiklerini çek
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const { data: quickStats, error: statsError } = await supabase
        .rpc('get_pl_report', { start_date: start, end_date: end })
        .single();

    const stats = quickStats as QuickStats | null;

    return (
        <div className="space-y-8">
            {/* Header */}
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Finansal Raporlar & Analizler</h1>
                <p className="text-text-main/80 mt-1">Gelir, gider ve kar analizlerine detaylı bakış</p>
            </header>

            {/* Hızlı İstatistikler - KPI Kartları */}
            <section>
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Bu Ay Özet</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard 
                        title="Brüt Ciro"
                        value={formatCurrency(stats?.totalGrossRevenue || 0)}
                        icon={FiShoppingCart}
                        bgColor="bg-blue-50"
                        iconBgColor="bg-blue-100"
                        iconColor="text-blue-600"
                        textColor="text-blue-700"
                        borderColor="border-blue-200"
                    />
                    <KPICard 
                        title="Net Gelir"
                        value={formatCurrency(stats?.totalRevenue || 0)}
                        icon={FiCreditCard}
                        bgColor="bg-indigo-50"
                        iconBgColor="bg-indigo-100"
                        iconColor="text-indigo-600"
                        textColor="text-indigo-700"
                        borderColor="border-indigo-200"
                    />
                    <KPICard 
                        title="Toplam Gider"
                        value={formatCurrency(stats?.totalExpenses || 0)}
                        icon={FiAlertCircle}
                        bgColor="bg-orange-50"
                        iconBgColor="bg-orange-100"
                        iconColor="text-orange-600"
                        textColor="text-orange-700"
                        borderColor="border-orange-200"
                    />
                    <KPICard 
                        title="Net Kar"
                        value={formatCurrency(stats?.netProfit || 0)}
                        icon={stats && stats.netProfit >= 0 ? FiTrendingUp : FiTrendingDown}
                        trend={stats && stats.netProfit >= 0 ? 'up' : 'down'}
                        bgColor={stats && stats.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}
                        iconBgColor={stats && stats.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}
                        iconColor={stats && stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}
                        textColor={stats && stats.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}
                        borderColor={stats && stats.netProfit >= 0 ? 'border-green-200' : 'border-red-200'}
                    />
                </div>
            </section>

            {/* Rapor Türleri */}
            <section>
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Detaylı Raporlar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ReportCard 
                        title="Kar & Zarar Raporu"
                        description="Gelir, gider ve kar/zarar analizi. Brüt kar, işletme giderleri ve net kar detayları."
                        icon={FiBarChart2}
                        href={`/${locale}/admin/idari/finans/raporlama/kar-zarar`}
                        color="primary"
                    />
                    <ReportCard 
                        title="Gider Analizi"
                        description="Kategori bazlı gider dağılımı, trend analizi ve dönemsel karşılaştırmalar."
                        icon={FiTrendingDown}
                        href={`/${locale}/admin/idari/finans/raporlama/giderler`}
                        color="accent"
                    />
                    <ReportCard 
                        title="Gelir Analizi"
                        description="Ciro detayları, ürün kategorisi bazlı gelirler ve büyüme oranları."
                        icon={FiTrendingUp}
                        href={`/${locale}/admin/idari/finans/raporlama/gelirler`}
                        color="green"
                    />
                    <ReportCard 
                        title="Talep Analizi"
                        description="En çok talep gören ürün ve kategoriler, favoriler ve müşteri segmentleri."
                        icon={FiPieChart}
                        href={`/${locale}/admin/idari/finans/raporlama/talep-analizi`}
                        color="blue"
                    />
                    <ReportCard 
                        title="Dönemsel Karşılaştırma"
                        description="Ay ay ve yıl bazında finansal performans karşılaştırmaları."
                        icon={FiActivity}
                        href={`/${locale}/admin/idari/finans/raporlama/karsilastirma`}
                        color="blue"
                    />
                </div>
            </section>

            {/* Top Gider Kategorileri (Özet) */}
            {stats && stats.expenseBreakdown && stats.expenseBreakdown.length > 0 && (
                <section>
                    <h2 className="font-serif text-2xl font-bold text-primary mb-4">Bu Ay Top Giderler</h2>
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                        <div className="space-y-3">
                            {stats.expenseBreakdown.slice(0, 5).map((exp, idx) => {
                                const percentage = stats.totalExpenses > 0 
                                    ? ((exp.toplam / stats.totalExpenses) * 100).toFixed(1) 
                                    : '0';
                                return (
                                    <div key={idx} className="flex justify-between items-center py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                                                ${idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-amber-500' : idx === 3 ? 'bg-yellow-500' : 'bg-gray-400'}`}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-semibold text-text-main block">{exp.kategori}</span>
                                                <span className="text-xs text-gray-500">{percentage}% toplam giderlerin</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-red-600 block">{formatCurrency(exp.toplam)}</span>
                                            <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                                                <div 
                                                    className={`h-1.5 rounded-full ${idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-amber-500' : idx === 3 ? 'bg-yellow-500' : 'bg-gray-400'}`}
                                                    style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}