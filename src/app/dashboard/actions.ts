"use server";
 
import { createClient } from '@/lib/supabase/server';
// notFound, burada gerekli değil ancak tipik sunucu eylemlerinde faydalı olabilir.

// ---------------------------------------------
// TİP TANIMLARI
// ---------------------------------------------
// Aylık ciro verisini tutmak için tip
interface MonthlyRevenue {
  month: string; // YYYY-MM formatında
  revenue: number; // Toplam ciro
}

// Müşteri durumu özetini tutmak için tip
interface CustomerStatusSummary {
  status: string;
  count: number;
}


// ---------------------------------------------
// AKSİYON 1: AYLIK CİRO GRAFİĞİ VERİSİNİ ÇEKME
// ---------------------------------------------
/**
 * Son N ayın toplam cirosunu çeker ve aylık gruplandırır.
 * @param months - Kaç ay geriye gidileceğini belirler (varsayılan: 6).
 */
export async function getMonthlyRevenue(months: number = 6): Promise<MonthlyRevenue[]> {
  const supabase = createClient();
  const dateLimit = new Date();
  
  // Son 'months' kadar ayı çekmek için başlangıç tarihini ayarla
  dateLimit.setMonth(dateLimit.getMonth() - months);
  
  const { data: orders, error } = await supabase
    .from('orders')
    .select('created_at, total')
    .gt('created_at', dateLimit.toISOString()) // Belirtilen tarihten sonraki siparişleri çek
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Aylık Ciro Çekme Hatası:", error);
    return [];
  }

  // Veriyi aylık gruplandırma ve ciro hesaplama
  const monthlyDataMap = orders.reduce((acc, order) => {
    // Tarihi YYYY-MM formatına dönüştür (Örn: 2025-10)
    const date = new Date(order.created_at);
    // JS'de getMonth 0-11 arasında döner, +1 ekleyip padStart ile 0 ekliyoruz
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // Total değerini Number'a dönüştürerek topla
    const total = parseFloat(order.total as any) || 0;
    
    acc[monthKey] = (acc[monthKey] || 0) + total;
    return acc;
  }, {} as { [key: string]: number });

  // Map'i grafiğe uygun dizi formatına dönüştür
  const revenueArray: MonthlyRevenue[] = Object.keys(monthlyDataMap)
    .sort() // Tarih sırasına göre sırala
    .map(key => ({
      month: key,
      // Ciro değerini 2 ondalık basamağa yuvarla
      revenue: parseFloat(monthlyDataMap[key].toFixed(2)),
    }));

  return revenueArray;
}


// ---------------------------------------------
// AKSİYON 2: MÜŞTERİ DURUM ÖZETİNİ ÇEKME
// ---------------------------------------------
/**
 * 'profiles' tablosundaki 'status' alanına göre müşteri sayısını gruplandırır.
 */
export async function getCustomerStatusSummary(): Promise<CustomerStatusSummary[]> {
  const supabase = createClient();
  
  // En verimli yol olan RPC'yi kullanır
  const { data, error } = await supabase.rpc('count_profiles_by_status'); 
  
  if (error) {
    console.error("Müşteri Durumu RPC Hatası:", error);
    
    // RPC yoksa veya hata verirse yedek (fallback) sorgu yap
    const fallbackQuery = await supabase.from('profiles').select('status');
    
    if (fallbackQuery.error) {
        console.error("Fallback Sorgu Hatası:", fallbackQuery.error);
        return [];
    }

    // Yedek veriyi gruplandırma
    const groupedData = fallbackQuery.data.reduce((acc, row) => {
        const status = row.status || 'Tanımsız';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });

    return Object.keys(groupedData).map(status => ({
        status: status,
        count: groupedData[status],
    }));

  }
  
  // RPC başarılı olursa veriyi döndür
  return (data as { status: string; count: number }[]);
}