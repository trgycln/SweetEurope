// src/app/[locale]/portal/raporlar/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { FiTrendingUp, FiPackage, FiUsers, FiDollarSign } from 'react-icons/fi';
import { RevenueChart, TopProductsChart, CustomerGrowthChart } from './ReportCharts';

export const dynamic = 'force-dynamic';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

interface MonthlyRevenue {
    month: string;
    revenue: number;
}

interface TopProduct {
    product_name: string;
    total_quantity: number;
    total_revenue: number;
}

interface CustomerGrowth {
    month: string;
    new_customers: number;
}

export default async function RaporlarPage({ params }: { params: { locale: Locale } }) {
    const { locale } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const dictionary = await getDictionary(locale);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return notFound();

    // Kullanıcının profilini ve firma bilgisini çek
    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (profile?.rol !== 'Alt Bayi' || !profile.firma_id) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-600 text-lg">Bu sayfaya erişim yetkiniz yok.</p>
            </div>
        );
    }

    const bayiFirmaId = profile.firma_id;

    // Son 6 ay için tarih aralığı
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const startDate = sixMonthsAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    // Aylık ciro trendi (alt_bayi_satislar tablosundan)
    const { data: monthlySales } = await supabase
        .from('alt_bayi_satislar')
        .select('created_at, toplam_brut')
        .eq('bayi_firma_id', bayiFirmaId)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

    // Aylık ciro verilerini grupla
    const monthlyRevenueMap = new Map<string, number>();
    (monthlySales || []).forEach((sale) => {
        const month = new Date(sale.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'short' });
        const current = monthlyRevenueMap.get(month) || 0;
        monthlyRevenueMap.set(month, current + (sale.toplam_brut || 0));
    });

    const monthlyRevenue: MonthlyRevenue[] = Array.from(monthlyRevenueMap.entries()).map(([month, revenue]) => ({
        month,
        revenue
    }));

    // En çok satan ürünler (alt_bayi_satis_detay üzerinden)
    const { data: productSales } = await supabase
        .from('alt_bayi_satis_detay')
        .select(`
            adet,
            satir_brut,
            urunler!inner(urun_adi),
            alt_bayi_satislar!inner(bayi_firma_id, created_at)
        `)
        .eq('alt_bayi_satislar.bayi_firma_id', bayiFirmaId)
        .gte('alt_bayi_satislar.created_at', sixMonthsAgo.toISOString());

    // Ürünleri grupla ve topla
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    (productSales || []).forEach((item: any) => {
        const productName = item.urunler?.urun_adi || 'Bilinmeyen Ürün';
        const current = productMap.get(productName) || { quantity: 0, revenue: 0 };
        productMap.set(productName, {
            quantity: current.quantity + (item.adet || 0),
            revenue: current.revenue + (item.satir_brut || 0)
        });
    });

    const topProducts: TopProduct[] = Array.from(productMap.entries())
        .map(([product_name, data]) => ({
            product_name,
            total_quantity: data.quantity,
            total_revenue: data.revenue
        }))
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 10);

    // Müşteri büyüme trendi
    const { data: customers } = await supabase
        .from('firmalar')
        .select('created_at')
        .eq('created_by_bayi_id', bayiFirmaId)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

    const customerGrowthMap = new Map<string, number>();
    (customers || []).forEach((customer) => {
        const month = new Date(customer.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'short' });
        const current = customerGrowthMap.get(month) || 0;
        customerGrowthMap.set(month, current + 1);
    });

    const customerGrowth: CustomerGrowth[] = Array.from(customerGrowthMap.entries()).map(([month, new_customers]) => ({
        month,
        new_customers
    }));

    // En çok ciro getiren müşteriler
    const { data: topCustomersData } = await supabase
        .from('alt_bayi_satislar')
        .select(`
            musteri_id,
            toplam_brut,
            firmalar!alt_bayi_satislar_musteri_id_fkey(unvan)
        `)
        .eq('bayi_firma_id', bayiFirmaId)
        .gte('created_at', sixMonthsAgo.toISOString());

    // Müşteri bazında topla
    const customerRevenueMap = new Map<string, { name: string; revenue: number; orders: number }>();
    (topCustomersData || []).forEach((sale: any) => {
        const customerId = sale.musteri_id;
        const customerName = sale.firmalar?.unvan || 'Bilinmeyen Müşteri';
        const current = customerRevenueMap.get(customerId) || { name: customerName, revenue: 0, orders: 0 };
        customerRevenueMap.set(customerId, {
            name: customerName,
            revenue: current.revenue + (sale.toplam_brut || 0),
            orders: current.orders + 1
        });
    });

    const topCustomers = Array.from(customerRevenueMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    // Özet KPI'lar
    const totalRevenue = monthlyRevenue.reduce((sum, item) => sum + item.revenue, 0);
    const totalOrders = monthlySales?.length || 0;
    const totalCustomers = customers?.length || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const content = dictionary.portal?.reports || {};

    return (
        <div className="space-y-8">
            {/* Header */}
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">
                    {content.title || 'Raporlarım'}
                </h1>
                <p className="text-text-main/80 mt-1">
                    {content.subtitle || 'Son 6 aylık iş performansınızın detaylı analizi'}
                </p>
            </header>

            {/* KPI Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm opacity-90">{content.totalRevenue || 'Toplam Ciro'}</p>
                        <FiDollarSign size={24} />
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
                    <p className="text-xs opacity-75 mt-1">{content.last6Months || 'Son 6 ay'}</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm opacity-90">{content.totalOrders || 'Toplam Satış'}</p>
                        <FiPackage size={24} />
                    </div>
                    <p className="text-3xl font-bold">{totalOrders}</p>
                    <p className="text-xs opacity-75 mt-1">{content.completedOrders || 'Tamamlanan sipariş'}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm opacity-90">{content.avgOrderValue || 'Ortalama Sepet'}</p>
                        <FiTrendingUp size={24} />
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(avgOrderValue)}</p>
                    <p className="text-xs opacity-75 mt-1">{content.perOrder || 'Sipariş başına'}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm opacity-90">{content.newCustomers || 'Yeni Müşteri'}</p>
                        <FiUsers size={24} />
                    </div>
                    <p className="text-3xl font-bold">{totalCustomers}</p>
                    <p className="text-xs opacity-75 mt-1">{content.last6Months || 'Son 6 ay'}</p>
                </div>
            </div>

            {/* Grafikler */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ciro Trendi */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="font-serif text-2xl font-bold text-primary mb-4">
                        {content.revenueTrend || 'Aylık Ciro Trendi'}
                    </h2>
                    <RevenueChart data={monthlyRevenue} locale={locale} />
                </div>

                {/* Müşteri Büyüme */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="font-serif text-2xl font-bold text-primary mb-4">
                        {content.customerGrowth || 'Müşteri Büyümesi'}
                    </h2>
                    <CustomerGrowthChart data={customerGrowth} />
                </div>
            </div>

            {/* En Çok Satan Ürünler */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">
                    {content.topProducts || 'En Çok Satan Ürünler'}
                </h2>
                <TopProductsChart data={topProducts} locale={locale} />
            </div>

            {/* En Çok Ciro Getiren Müşteriler */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">
                    {content.topCustomers || 'En Çok Ciro Getiren Müşteriler'}
                </h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Müşteri
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Sipariş Adedi
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Toplam Ciro
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {topCustomers.length > 0 ? (
                                topCustomers.map((customer, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {customer.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                            {customer.orders}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary text-right">
                                            {formatCurrency(customer.revenue)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                        Henüz müşteri verisi bulunmamaktadır.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
