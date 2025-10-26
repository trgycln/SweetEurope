// src/app/[locale]/admin/operasyon/siparisler/yeni/page.tsx
// TAM VE DÜZELTİLMİŞ KOD (await params, searchParams, cookies, createClient)

import { createSupabaseServerClient } from "@/lib/supabase/server";
// İstemci bileşeninizin doğru yolunu ve adını buraya yazdığınızdan emin olun!
// Örnek: import YeniSiparisFormu from "./YeniSiparisFormu";
import { SiparisOlusturmaClient as YeniSiparisFormu } from "@/components/siparis-olusturma-client"; // Doğru yolu ve adı kullanın
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiSlash } from "react-icons/fi";
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { Tables, Database, Enums } from "@/lib/supabase/database.types"; // Enums eklendi
import { unstable_noStore as noStore } from 'next/cache'; // noStore eklendi

export const dynamic = 'force-dynamic'; // Dinamik render zorunlu

// Tipler
type ProductOption = Pick<Tables<'urunler'>, 'id' | 'ad' | 'satis_fiyati_musteri' | 'satis_fiyati_alt_bayi' | 'stok_miktari'>;
type FirmaWithFinanz = Tables<'firmalar'> & { firmalar_finansal: Tables<'firmalar_finansal'> | null };
type FirmaOption = Pick<Tables<'firmalar'>, 'id' | 'unvan'>;
type UserProfile = Pick<Tables<'profiller'>, 'id' | 'rol'> | null;
type UserRole = Enums<'user_role'> | null; // UserRole tipi eklendi

// Sayfa Props Tipi (Promise'ları içerecek şekilde)
interface YeniSiparisPageProps {
    params: Promise<{ // params Promise
        locale: Locale;
    }>;
    searchParams: Promise<{ // searchParams Promise
        firmaId?: string;
    }>;
}

export default async function YeniSiparisPage({ params, searchParams }: YeniSiparisPageProps) {
    noStore(); // Önbellekleme devre dışı

    // --- Promise'ları Çözümle ---
    const resolvedParams = await params;
    const locale = resolvedParams.locale;
    const resolvedSearchParams = await searchParams;
    const firmaId = resolvedSearchParams?.firmaId;
    // --- BİTTİ ---

    console.log('🟢 YeniSiparisPage Başladı', { locale, firmaId });

    // --- Supabase Client Doğru Şekilde Başlat ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- BİTTİ ---

    // Kullanıcı Doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user) {
        const redirectUrl = `/admin/operasyon/siparisler/yeni${firmaId ? `?firmaId=${firmaId}` : ''}`;
        console.log('Kullanıcı bulunamadı, login sayfasına yönlendiriliyor:', redirectUrl);
        return redirect(`/${locale}/login?next=${encodeURIComponent(redirectUrl)}`);
    }

    // Paralel Veri Çekme İşlemleri
    const promises = [];
    let firmaPromise;

    if (firmaId) {
        // Belirli bir firma ve finansal bilgilerini çek
        firmaPromise = supabase.from('firmalar')
            .select('*, firmalar_finansal(*)')
            .eq('id', firmaId)
            .single();
    } else {
        // firmaId yoksa, dropdown için aktif firmaların listesini çek
        firmaPromise = supabase.from('firmalar')
            .select('id, unvan')
            .not('status', 'eq', 'Pasif')
            .order('unvan')
            .then(res => ({ data: res.data, error: res.error })); // Tutarlılık için
    }
    promises.push(firmaPromise);


    // Aktif ve stokta olan ürünleri çek
    promises.push(
        supabase.from('urunler')
            .select('id, ad, satis_fiyati_musteri, satis_fiyati_alt_bayi, stok_miktari') // stok_miktari eklendi
            .eq('aktif', true)
            .gt('stok_miktari', 0)
            .order(`ad->>${locale}`, { ascending: true, nullsFirst: false })
            .order(`ad->>de`, { ascending: true, nullsFirst: false }) // Fallback
    );

    // Kullanıcı profilini (rol için) çek
    promises.push(
        supabase.from('profiller')
            .select('id, rol')
            .eq('id', user.id)
            .single()
    );

    // Tüm sorguları paralel çalıştır
    const [firmaRes, urunlerRes, profilRes] = await Promise.all(promises);

    // Sonuçları ve Hataları Ayıkla (Daha detaylı hata loglama ile)
    const firmaResult = firmaRes as { data: FirmaWithFinanz | FirmaOption[] | null, error: any };
    const urunlerResult = urunlerRes as { data: ProductOption[] | null, error: any };
    const profilResult = profilRes as { data: UserProfile, error: any };

    const firmaError = firmaResult.error;
    const urunlerError = urunlerResult.error;
    const profilError = profilResult.error;

    let hasError = false;
    if (firmaError) { console.error("❌ Firma yüklenirken hata:", firmaError); hasError = true; }
    if (urunlerError) { console.error("❌ Ürünler yüklenirken hata:", urunlerError); hasError = true; }
    if (profilError) { console.error("❌ Profil yüklenirken hata:", profilError); hasError = true; }

    // Herhangi bir hata varsa kullanıcıya bilgi ver
    if (hasError) {
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Gerekli veriler yüklenirken hata oluştu. Lütfen sunucu loglarını kontrol edin.</div>;
    }

    // Firma ID'si varsa ama firma bulunamadıysa 404 göster
    if (firmaId && !firmaResult.data) {
        console.error(`Firma ID ${firmaId} ile bulunamadı.`);
        notFound();
    }
    // Profil bulunamadıysa login'e yönlendir
    if (!profilResult.data) {
         console.error(`Profil kullanıcı ${user.id} için bulunamadı.`);
         return redirect(`/${locale}/login?error=profile_not_found`);
    }

    // Verileri değişkenlere ata
    let firma: FirmaWithFinanz | null = null;
    let firmenListe: FirmaOption[] | null = null;
     if (firmaId && firmaResult.data) {
        firma = firmaResult.data as FirmaWithFinanz;
    } else if (!firmaId && firmaResult.data) {
        firmenListe = firmaResult.data as FirmaOption[];
    }
    const urunler = urunlerResult.data || [];
    const userRole = profilResult.data.rol as UserRole; // Tip ataması

    // Yetki Kontrolü
    const firmaSorumlusuId = firma?.sorumlu_personel_id;
    // Eğer belirli bir firma için sipariş oluşturuluyorsa ve kullanıcı Yönetici değilse, sadece sorumlu personel oluşturabilir
    if (firmaId && userRole !== 'Yönetici' && user.id !== firmaSorumlusuId) {
        return (
            <div className="p-8 text-center">
                <FiSlash className="mx-auto text-5xl text-red-500 mb-4" />
                <h1 className="font-serif text-2xl text-red-600">Yetkisiz Erişim</h1>
                <p className="text-gray-600 mt-2">Sadece size atanmış müşteriler için sipariş oluşturabilirsiniz.</p>
            </div>
        );
    }
    // Eğer firma ID'si olmadan genel sayfaya gelindiyse, sadece Yönetici firma seçerek devam edebilir
     if (!firmaId && userRole !== 'Yönetici') {
         return (
             <div className="p-8 text-center">
                 <FiSlash className="mx-auto text-5xl text-red-500 mb-4" />
                 <h1 className="font-serif text-2xl text-red-600">Yetkisiz Erişim</h1>
                 <p className="text-gray-600 mt-2">Lütfen önce CRM listesinden bir müşteri seçin.</p>
             </div>
         );
     }

    // Sayfayı Render Et
    return (
        <div className="space-y-6">
            <div>
                {/* Geri Linki */}
                <Link
                    href={firmaId ? `/${locale}/admin/crm/firmalar/${firmaId}/siparisler` : `/${locale}/admin/operasyon/siparisler`}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors"
                >
                    <FiArrowLeft />
                    {firmaId ? 'Firmanın Sipariş Listesine Geri Dön' : 'Sipariş Yönetimine Geri Dön'}
                </Link>
                {/* Başlık */}
                <h1 className="font-serif text-4xl font-bold text-primary mt-2">Yeni Sipariş Oluştur</h1>
                {/* Alt Başlık */}
                {firma && (
                    <p className="text-gray-600 mt-1"><span className="font-bold text-accent">{firma.unvan}</span> için yeni bir sipariş oluşturuluyor.</p>
                )}
                 {!firmaId && (
                     <p className="text-gray-600 mt-1">Bir firma seçin ve ürünleri ekleyin.</p>
                 )}
            </div>

            {/* Client Form Bileşeni */}
            {/* Import yolunun ve adının doğru olduğundan emin olun */}
            <YeniSiparisFormu
                firma={firma} // Null olabilir
                firmenListe={firmenListe} // Null olabilir
                varsayilanTeslimatAdresi={firma?.adres || ''}
                urunler={urunler}
                userRole={userRole} // Kullanıcı rolünü Client'a iletiyoruz
                locale={locale} // Locale'i Client'a iletiyoruz
            />
        </div>
    );
}