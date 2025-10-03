"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { dictionary } from '@/dictionaries/de';
import { FaSignOutAlt, FaEuroSign, FaBox, FaStar, FaPlusCircle } from 'react-icons/fa';
import StatCard from '@/components/StatCard';
import TopProductCard from '@/components/TopProductCard';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import MarketingKitSection from '@/components/MarketingKitSection';
import SalesChart from '@/components/SalesChart';
import OrderDetailModal from '@/components/OrderDetailModal';

// Tipler
interface Product { id: number; name_de: string; image_url: string; }
interface Order { id: number; created_at: string; order_id: string; total: number; status: string; order_items?: any[]; }
interface Stat { title: string; value: string; icon: React.ReactNode; }

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [topProduct, setTopProduct] = useState<Product | null>(null);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || null);
      
      const { data: ordersData, error: ordersError } = await supabase.from('orders').select('*');
      if (ordersError) {
        console.error('Siparişler çekilirken hata oluştu:', ordersError);
      } else if (ordersData) {
        setOrders(ordersData as Order[]);
        setTotalRevenue(ordersData.reduce((acc, order) => acc + order.total, 0));

        const { data: topProductData, error: rpcError } = await supabase.rpc('get_top_product_for_user', { p_user_id: user.id });
        if(rpcError) console.error("Top ürün çekilirken hata:", rpcError);
        else setTopProduct(topProductData);
      }
    } else {
      router.push('/portal');
    }
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => { /* ... */ };
  const handleRowClick = async (params: GridRowParams<Order>) => { /* ... */ };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <p className="font-sans text-lg">{dictionary.dashboard.loading}</p>
      </div>
    );
  }

  const columns: GridColDef<Order>[] = [ /* ... */ ];

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <Link href="/dashboard/neue-bestellung" className="bg-accent text-primary p-6 rounded-lg shadow-lg flex flex-col items-center justify-center text-center font-bold hover:opacity-90 transition-opacity">
                    <FaPlusCircle size={32} className="mb-2" />
                    <span>{dictionary.dashboard.newOrder}</span>
                </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard title={dictionary.dashboard.monthlyRevenue} value={`€ ${totalRevenue.toFixed(2).replace('.', ',')}`} icon={<FaEuroSign className="text-accent" />} />
            <StatCard title={dictionary.dashboard.newOrders} value={`${orders.length}`} icon={<FaBox className="text-accent" />} />
            <TopProductCard title={dictionary.dashboard.topProduct} product={topProduct} icon={<FaStar className="text-accent" />} />
          </div>

          <SalesChart orders={orders} dictionary={dictionary} />
          
          <div style={{ height: 400, width: '100%' }} className="bg-white rounded-lg shadow-lg mt-8">
            <DataGrid
              rows={orders}
              columns={columns}
              getRowId={(row) => row.order_id}
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