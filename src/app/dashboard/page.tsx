"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { dictionary } from '@/dictionaries/de';
import { FaSignOutAlt, FaPlusCircle, FaEuroSign, FaBox, FaStar } from 'react-icons/fa';
import StatCard from '@/components/StatCard';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import MarketingKitSection from '@/components/MarketingKitSection';
import SalesChart from '@/components/SalesChart';
import OrderDetailModal from '@/components/OrderDetailModal';

// Ürünler için gerekli tip tanımı (order_items içinden geliyor)
interface OrderItemProduct {
  name: string;
  price: number;
  // Diğer ürün alanlarını buraya ekleyin
}

// Sipariş Kalemleri (Order Items) için tip tanımı
interface OrderItem {
    id: number;
    quantity: number;
    products: OrderItemProduct; // products(*)'dan gelen ürün detayları
}

// Sipariş verisi için tip tanımı (Supabase'den gelen veriye uygun)
interface Order {
  id: number; // Siparişin ana, sayısal ID'si
  created_at: string;
  order_id: string; // "SD-9001" gibi metin tabanlı ID
  total: number;
  status: string;
  order_items?: OrderItem[]; // <-- 22. SATIR DÜZELTİLDİ: 'any[]' yerine 'OrderItem[]' kullanıldı
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
        
        const { data: ordersData, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Siparişler çekilirken hata oluştu:', error);
        } else if (ordersData) {
          // Supabase verileri tip olarak her zaman array of objects (Object[]) döndürür.
          // Güvenli şekilde 'as Order[]' ile tipi belirtiyoruz.
          setOrders(ordersData as Order[]); 
        }
      } else {
        router.push('/portal');
      }
      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Bir sipariş satırına tıklandığında çalışacak fonksiyon
  const handleRowClick = async (params: GridRowParams) => {
    const clickedOrder = params.row as Order;

    // Supabase'den bu siparişe ait ürünleri çek
    // 'products(*)' ifadesi sayesinde ürünlerin detaylarını da (ad, fiyat vb.) alıyoruz
    const { data: items, error } = await supabase
      .from('order_items')
      .select('*, products(*)')
      .eq('order_id', clickedOrder.id); // Siparişin ana ID'si ile filtrele

    if (error) {
      console.error("Sipariş detayları çekilirken hata:", error);
    } else {
      // Çekilen 'items' verisinin tipini de 'OrderItem[]' olarak kabul ediyoruz.
      setSelectedOrder({ ...clickedOrder, order_items: items as OrderItem[] }); 
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <p className="font-sans text-lg">{dictionary.dashboard.loading}</p>
      </div>
    );
  }

  // Analizler (Daha sonra bu verileri de daha detaylı hale getireceğiz)
  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
  const stats = [
    { title: dictionary.dashboard.monthlyRevenue, value: `€ ${totalRevenue.toFixed(2).replace('.', ',')}`, icon: <FaEuroSign className="text-accent" /> },
    { title: dictionary.dashboard.newOrders, value: `${orders.length}`, icon: <FaBox className="text-accent" /> },
    { title: dictionary.dashboard.topProduct, value: 'N/A', icon: <FaStar className="text-accent" /> },
  ];

  const columns: GridColDef[] = [
    { field: 'order_id', headerName: dictionary.dashboard.orderId, width: 150 },
    { field: 'created_at', headerName: dictionary.dashboard.date, width: 180, valueFormatter: (value: string) => new Date(value).toLocaleDateString('de-DE') },
    { field: 'total', headerName: dictionary.dashboard.total, type: 'number', width: 150, valueFormatter: (value: number) => `€${value.toFixed(2).replace('.', ',')}`},
    { field: 'status', headerName: dictionary.dashboard.status, width: 200 },
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
                        {/* --- HIZLI EYLEMLER BÖLÜMÜ EKLENDİ --- */}
          <div className="mb-8">
            <h3 className="text-xl font-serif font-bold text-primary mb-4">{dictionary.dashboard.quickActions}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <Link href="/dashboard/neue-bestellung" className="bg-accent text-primary p-6 rounded-lg shadow-lg flex flex-col items-center justify-center text-center font-bold hover:opacity-90 transition-opacity">
                <FaPlusCircle size={32} className="mb-2" />
                <span>{dictionary.dashboard.newOrder}</span>
              </Link>
              {/* Diğer hızlı eylemler (örn: "Favorileri Sipariş Et") gelecekte buraya eklenebilir */}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, index) => (
              <StatCard key={index} title={stat.title} value={stat.value} icon={stat.icon} />
            ))}
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