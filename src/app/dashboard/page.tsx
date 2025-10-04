"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
// Dizin dosyasını doğru yoldan içe aktarın
import { dictionary } from '@/dictionaries/de'; 
import { FaSignOutAlt, FaEuroSign, FaBox, FaStar, FaPlusCircle, FaThList } from 'react-icons/fa';
import StatCard from '@/components/StatCard';
import TopProductCard from '@/components/TopProductCard';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import MarketingKitSection from '@/components/MarketingKitSection';
import SalesChart from '@/components/SalesChart';
import OrderDetailModal from '@/components/OrderDetailModal';

// --- YENİ/GÜNCELLENMİŞ TİP TANIMLAMALARI ---
interface Product { id: number; name_de: string; image_url: string; }
interface Order { id: number; created_at: string; order_id: string; total: number; status: string; order_items?: any[]; }
interface Stat { title: string; value: string; icon: React.ReactNode; }
// En çok alınan ürün tipi
interface TopBoughtProduct { product_id: number; product_name: string; total_quantity: number; }
// --- BİTİŞ ---

// ---------------------------------------------
// YENİ BİLEŞEN: EN ÇOK ALINAN ÜRÜNLER LİSTESİ (Dil desteği eklendi)
// ---------------------------------------------
const TopProductsList: React.FC<{ products: TopBoughtProduct[] }> = ({ products }) => {
    // Sözlükten metinleri çek
    const { topProductsTitle, noProductData, unit } = dictionary.dashboard.customerReports;

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-serif font-bold text-primary mb-4 flex items-center gap-2">
                <FaThList className="text-accent" /> {topProductsTitle}
            </h3>
            {products.length === 0 ? (
                <p className="text-gray-500">{noProductData}</p>
            ) : (
                <ul className="space-y-3">
                    {products.slice(0, 5).map((p, index) => (
                        <li key={p.product_id} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                            <span className="font-medium">{index + 1}. {p.product_name}</span>
                            {/* Miktarı ve birimi Almanca formatında göster */}
                            <span className="text-sm font-bold text-accent">
                                {new Intl.NumberFormat('de-DE').format(p.total_quantity)} {unit}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


export default function DashboardPage() {
    const router = useRouter();
    const supabase = createClient();
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [stats, setStats] = useState<Stat[]>([]);
    const [topProduct, setTopProduct] = useState<Product | null>(null);
    // Yeni state
    const [topBoughtProducts, setTopBoughtProducts] = useState<TopBoughtProduct[]>([]);


    // En çok alınan ürünleri çeken RPC fonksiyonu (Değişmedi)
    const getTopBoughtProducts = useCallback(async (currentUserId: string): Promise<TopBoughtProduct[]> => {
        const { data, error } = await supabase.rpc('get_top_bought_products_for_user', { p_user_id: currentUserId });

        if (error) {
            console.error("En çok alınan ürünler çekilirken hata:", error);
            return [];
        }
        
        return data as TopBoughtProduct[];
    }, [supabase]);


    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/portal');
            return;
        }

        const currentUserId = user.id;
        setUserEmail(user.email || null);
        setUserId(currentUserId);
            
        // 1. Siparişleri Çekme
        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', currentUserId) 
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error('Siparişler çekilirken hata oluştu:', ordersError);
            setLoading(false);
            return;
        } 
            
        if (ordersData) {
            setOrders(ordersData as Order[]);

            // 2. İstatistikleri ve Top Ürünü Paralel Çekme
            const [topProductData, topBoughtProductsData] = await Promise.all([
                supabase.rpc('get_top_product_for_user', { p_user_id: currentUserId }),
                getTopBoughtProducts(currentUserId) 
            ]);

            if(topProductData.error) console.error("Top ürün çekilirken hata:", topProductData.error);
            else setTopProduct(topProductData.data);
            
            setTopBoughtProducts(topBoughtProductsData);

            // 3. İstatistik Hesaplama
            const totalRevenue = ordersData.reduce((acc, order) => acc + order.total, 0);
            // Almanca metni kullan
            const newOrdersCount = ordersData.filter(o => o.status === dictionary.dashboard.statusProcessing).length; 
            
            setStats([
                { 
                    title: dictionary.dashboard.monthlyRevenue, 
                    // Sayı formatlamasını Almanca (de-DE) standardına uygun yap
                    value: `€ ${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalRevenue)}`, 
                    icon: <FaEuroSign className="text-accent" /> 
                },
                { 
                    title: dictionary.dashboard.newOrders, 
                    value: `${ordersData.length}`, 
                    icon: <FaBox className="text-accent" /> 
                },
            ]);
        }

        setLoading(false);
    }, [router, supabase, getTopBoughtProducts]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleRowClick = async (params: GridRowParams<Order>) => {
        const clickedOrder = params.row;
        // Sipariş detaylarını çekerken ürün adlarını Almanca olarak çeken 'products(name_de)' doğru kullanılmış.
        const { data: items, error } = await supabase.from('order_items').select('*, products(name_de)').eq('order_id', clickedOrder.id);
        if (error) {
            console.error("Sipariş detayları çekilirken hata:", error);
        } else {
            setSelectedOrder({ ...clickedOrder, order_items: items });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary">
                <p className="font-sans text-lg">{dictionary.dashboard.loading}</p>
            </div>
        );
    }

    const columns: GridColDef<Order>[] = [
        { field: 'order_id', headerName: dictionary.dashboard.orderId, width: 150 },
        { 
            field: 'created_at', 
            headerName: dictionary.dashboard.date, 
            width: 180, 
            type: 'dateTime', 
            valueGetter: (value) => new Date(value),
            // Opsiyonel: Tarih formatını Almanca yap
            valueFormatter: (value) => value ? new Date(value).toLocaleDateString('de-DE') : ''
        },
        { 
            field: 'total', 
            headerName: dictionary.dashboard.total, 
            type: 'number', 
            width: 150, 
            // Para birimi formatını Almanca yap: '€1.234,56'
            valueFormatter: (value: number) => `€${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
        },
        { field: 'status', headerName: dictionary.dashboard.status, width: 200, flex: 1 },
    ];

    return (
        <>
            <div className="bg-secondary min-h-screen">
                <header className="bg-white shadow-md">
                    <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                        <h1 className="text-2xl font-serif font-bold text-primary">{dictionary.dashboard.title}</h1>
                        <button onClick={handleLogout} className="flex items-center gap-2 font-bold text-primary hover:text-accent transition-colors">
                            <span>{dictionary.dashboard.logout}</span>
                            <FaSignOutAlt />
                        </button>
                    </div>
                </header>
                <main className="container mx-auto p-6">
                    <div className="mb-8">
                        <h2 className="text-3xl font-serif text-primary">
                            {dictionary.dashboard.welcome} <span className="text-accent">{userEmail}</span>
                        </h2>
                    </div>
                    
                    <div className="mb-8">
                        <h3 className="text-xl font-serif font-bold text-primary mb-4">{dictionary.dashboard.quickActions}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <Link href="/dashboard/neue-bestellung" className="bg-accent text-primary p-6 rounded-lg shadow-lg flex flex-col items-center justify-center text-center font-bold hover:opacity-90 transition-opacity">
                                <FaPlusCircle size={32} className="mb-2" />
                                <span>{dictionary.dashboard.newOrder}</span>
                            </Link>
                        </div>
                    </div>
                    
                    {/* İSTATİSTİK BÖLÜMÜNÜ GÜNCELLEDİK: Top Products List eklendi */}
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                        {/* StatCard'lar */}
                        {stats.map((stat, index) => (
                            <StatCard key={index} title={stat.title} value={stat.value} icon={stat.icon} />
                        ))}
                        <TopProductCard title={dictionary.dashboard.topProduct} product={topProduct} icon={<FaStar className="text-accent" />} />
                        
                        {/* YENİ EKLENEN: En Çok Alınan Ürünler Listesi */}
                        <div className="md:col-span-3 xl:col-span-4">
                            <TopProductsList products={topBoughtProducts} />
                        </div>
                    </div>
                    
                    <SalesChart orders={orders} dictionary={dictionary} />
                    
                    <div style={{ height: 400, width: '100%' }} className="bg-white rounded-lg shadow-lg mt-8">
                        <DataGrid
                            rows={orders}
                            columns={columns}
                            getRowId={(row) => row.order_id}
                            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 5 }, } }}
                            pageSizeOptions={[5, 10]}
                            onRowClick={handleRowClick}
                            sx={{ '& .MuiDataGrid-row:hover': { cursor: 'pointer' } }}
                        />
                    </div>

                    <MarketingKitSection dictionary={dictionary} />
                </main>
            </div>
            {selectedOrder && (
                <OrderDetailModal 
                    order={selectedOrder} 
                    dictionary={dictionary} 
                    onClose={() => setSelectedOrder(null)} 
                />
            )}
        </>
    );
}