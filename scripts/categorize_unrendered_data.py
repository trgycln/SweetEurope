import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

# Let's inspect all fields in urunler and classify them:
fields_in_db = {
    # Core & Identity
    "id": "Dahili UUID (Sistem ID)",
    "slug": "URL adresi / Routing için kullanılıyor",
    "ad": "Ürün Adı (TR/DE/EN/AR) -> Hem kartta hem detayda gösteriliyor",
    "stok_kodu": "Stok Kodu / Art.-Nr. (örn. FO-SRP-003) -> Detay sayfasında var, Liste kartında yok",
    "ean_gtin": "EAN Barkod (869...) -> Hem kartta hem detayda gösteriliyor",
    "gtip_kodu / taric_kodu": "Gümrük Tarife İstatistik Kodu -> Detay sayfasında 'HS / TARIC Code' olarak var",
    "kategori_id": "Kategori -> Hem kartta hem detayda kategori adı olarak gösteriliyor",
    "tedarikci_id": "Dahili Tedarikçi UUID -> Public sayfada gösterilmez",
    "aktif": "Aktiflik durumu -> Pasif olanlar sitede yayınlanmaz",

    # Fiyat & Maliyet (B2B)
    "satis_fiyati_musteri": "1 Karton Standart Fiyatı -> Kartta ve detayda gösteriliyor",
    "satis_fiyati_toptanci": "5+ Karton Toptan Fiyatı -> Kartta ve detayda gösteriliyor",
    "satis_fiyati_alt_bayi": "Palet Fiyatı -> Kartta ve detayda gösteriliyor",
    "satis_fiyati_palet": "Palet Birim Fiyatı (Alternatif)",
    "distributor_alis_fiyati": "Fabrika Alış Fiyatı -> Gizli ticari veri (Gösterilmez)",
    "standart_inis_maliyeti_net": "Köln Depo İniş Maliyeti -> Gizli ticari veri (Gösterilmez)",
    "karlilik_alarm_aktif": "ERP Karlılık Uyarısı -> Dahili admin verisi",
    "almanya_kdv_orani": "Almanya KDV Oranı (%7) -> 'zzgl. MwSt.' metni var, dinamik %7 oranı yazılmıyor",

    # Lojistik & Ambalaj
    "koli_ici_adet": "Koli İçi Adet (6 / 12) -> Hem kartta ('6 Stk./Ktn.') hem detayda var",
    "palet_ici_adet": "Palet İçi Koli (125 / 170 / 60) -> Hem kartta ('125 Ktn./Pal.') hem detayda var",
    "birim_agirlik_kg": "Birim Ağırlık -> Detay sayfasında (1 Stück: 930 g) var",
    "mindest_bestellmenge": "Minimum Sipariş Miktarı (1) -> Detay sayfasında (MOQ: 1 Karton) var",
    "mindest_bestellmenge_einheit": "MOQ Birimi (Karton) -> Detay sayfasında var",
    "lieferzeit_werktage": "Teslimat Süresi (3 İş Günü) -> Detay sayfasında var",
    "lojistik_sinifi": "Lojistik Sınıfı (cold-chain / standart) -> Kartta sıcaklık rozeti var",
    "lagertemperatur_min_celsius / max": "Depolama Sıcaklığı -> Rozette veya saklama koşullarında var",
    "alis_fiyat_seviyesi": "ERP Alış Birimi Seviyesi -> Dahili veri",
    "tedarik_turu": "Tedarik Türü (stoklu) -> Dahili veri",
    "stok_miktari": "Depo Stok Sayısı -> Public'te 'Auf Lager / Stokta' olarak var, kesin rakam gizli",
    "stok_esigi": "Kritik Stok Eşiği (10) -> Dahili ERP verisi",
    "stok_tukenme_tarihi": "Tahmini Stok Tükenme -> Dahili ERP verisi",

    # Ürün İçeriği & Detaylar
    "aciklamalar": "Detaylı Ürün Açıklaması -> Detay sayfasında var",
    "ana_resim_url": "Ürün Görseli -> Kartta ve detayda var",
    "galeri_resim_urls": "Ek Görseller -> Detay sayfasında varsa küçük resim olarak var",
    "inhaltsstoffe": "İçindekiler / Zutatenliste -> Detay sayfasında var",
    "allergene": "Alerjen Bilgisi -> Detay sayfasında var",
    "naehrwerte / besin_degerleri": "Besin Değerleri Tablosu -> Detay sayfasında var",
    "hersteller_name": "Üretici Adı (ÖZMER PASTACILIK A.Ş.) -> Detay sayfasında var",
    "hersteller_land": "Menşei Ülke (Türkiye) -> Detay sayfasında var",
    "haltbarkeit_monate": "Raf Ömrü (Monate) -> Detay sayfasında var",
    "produktdatenblatt_url": "Ürün Spekt / Datenblatt PDF -> Detay sayfasında 'Produktdatenblatt (PDF)' butonu var",
    "is_bestseller": "Bestseller Bayrağı -> Kartta '🏆 Bestseller' rozeti olarak var",
    "is_featured": "Öne Çıkan Bayrağı -> Kartta 'Empfohlen' rozeti olarak var",
    "ortalama_puan / degerlendirme_sayisi": "Puan & Değerlendirme -> Sistemde 0",
    "zertifikate": "Sertifikalar (Halal, ISO...) -> Rozetlerde var",
    "seo_meta": "Meta Title & Description -> Sayfa header HTML meta etiketlerinde var",

    # teknik_ozellikler JSONB içindekiler
    "teknik:hazirlanisi": "Barista Servis & Hazırlanış Rehberi -> Detay sayfasında var",
    "teknik:kullanim_alanlari": "Kullanım Alanları -> Detay sayfasında var",
    "teknik:saklama_kosullari": "Saklama Koşulları -> Detay sayfasında var",
    "teknik:alerjen_bilgisi": "Detaylı Alerjen Metni -> Detay sayfasında var",
    "teknik:vegan, glutenfrei, laktosefrei, halal, ohne_zucker": "Diyet Rozetleri -> Kartta ve detayda var",
    "teknik:raf_omru": "Raf Ömrü Metni -> Detay sayfasında var",
    "teknik:ambalaj": "Ambalaj Bilgisi -> Detay sayfasında var",
    "teknik:fostore_url": "FO Orijinal Fabrika Mağaza Linki -> GÖSTERİLMİYOR (Fabrika B2B linki)",
    "teknik:spec_file": "Orijinal Spekt Dosya Adı -> GÖSTERİLMİYOR (Dahili referans)",
    "teknik:geschmack": "Tat / Aroma Profili (mango, kiwi, vb.) -> Arama & filtrede kullanılıyor, kartta ayrı rozet olarak basılmıyor"
}

print(f"Toplam incelenen veri alanı sayısı: {len(fields_in_db)}")
for k, v in fields_in_db.items():
    print(f"{k:<35} | {v}")
