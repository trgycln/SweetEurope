// src/app/admin/operasyon/urunler/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tables } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { FiPlus, FiArchive } from 'react-icons/fi';

// Sayfada göstereceğimiz verinin tipini tanımlıyoruz.
// Bu, ürünler tablosundan gelen tüm gerekli alanları ve ilişkili kategori adını içerir.
type UrunWithKategori = Tables<'urunler'> & {
  kategoriler: {
    ad: { [key: string]: string } | null;
  } | null;
};

// YENİ BİLEŞEN: Stok durumunu istenen şekilde renkli ve akıllı olarak gösterir.
const StokDurumGostergesi = ({ miktar, esik }: { miktar: number | null; esik: number | null }) => {
    const mevcutMiktar = miktar || 0;
    const uyariEsigi = esik || 0;

    let durum = { text: 'Yeterli', color: 'bg-green-100 text-green-800' };
    if (mevcutMiktar <= 0) {
        durum = { text: 'Tükendi', color: 'bg-red-100 text-red-800' };
    } else if (mevcutMiktar <= uyariEsigi) {
        durum = { text: 'Azaldı', color: 'bg-yellow-100 text-yellow-800' };
    }

    return (
        <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800">{mevcutMiktar}</span>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold leading-5 rounded-full ${durum.color}`}>
                {durum.text}
            </span>
        </div>
    );
};

export default async function UrunlerListPage() {
    const supabase = createSupabaseServerClient();
    const locale = 'tr'; // Bu değer ileride dinamik olarak (örneğin URL'den) alınabilir.

    // 1. Güvenlik: Kullanıcı doğrulaması
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // 2. Veri Çekme: Stok eşiği dahil tüm gerekli alanları çekiyoruz.
    const { data: urunler, error } = await supabase
        .from('urunler')
        .select(`
            id,
            ad,
            stok_kodu,
            stok_miktari,
            stok_esigi,
            satis_fiyati_musteri,
            aktif,
            kategoriler ( ad )
        `)
        .order(`ad->>${locale}`, { ascending: true });

    if (error) {
        console.error("Ürünler çekilirken hata:", error);
        return <div className="p-6 text-red-500">Ürün listesi yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</div>;
    }

    const urunListesi: UrunWithKategori[] = urunler as any;

    return (
        <div className="space-y-8">
            {/* Sayfa Başlığı ve Eylem Butonu */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">Ürünler</h1>
                    <p className="text-text-main/80 mt-1">{urunListesi.length} adet ürün listeleniyor.</p>
                </div>
                <Link href="/admin/operasyon/urunler/yeni" passHref>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                        <FiPlus size={18} />
                        Yeni Ürün Ekle
                    </button>
                </Link>
            </header>

            {/* Ürün Listesi veya Boş Durum Mesajı */}
            {urunListesi.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiArchive className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">Henüz Ürün Eklenmemiş</h2>
                    <p className="mt-2 text-text-main/70">Başlamak için "Yeni Ürün Ekle" butonunu kullanın.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Ürün Adı', 'Stok Kodu', 'Kategori', 'Stok Durumu', 'Fiyat (Müşteri)', 'Satış Durumu'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {urunListesi.map((urun) => (
                                <tr key={urun.id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                        <Link href={`/admin/operasyon/urunler/${urun.id}`} className="hover:underline hover:text-accent transition-colors">
                                            {urun.ad?.[locale] || 'İsimsiz Ürün'}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                        {urun.stok_kodu || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {urun.kategoriler?.ad?.[locale] || 'Kategorisiz'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <StokDurumGostergesi miktar={urun.stok_miktari} esik={urun.stok_esigi} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {urun.satis_fiyati_musteri?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${
                                            urun.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {urun.aktif ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}