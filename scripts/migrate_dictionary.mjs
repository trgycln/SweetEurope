import fs from 'fs';
import path from 'path';

const T = {
    de: {
        category: 'Kategorie', sku: 'Art.-Nr.', ean: 'EAN / GTIN',
        description: 'Produktbeschreibung', specs: 'Technische Daten',
        packaging: 'Verpackung & Logistik',
        unit: 'Einheit', box: 'Karton', case: 'Kiste', pallet: 'Palette',
        weight: 'Gewicht', volume: 'Volumen',
        contact: 'Preisanfrage stellen',
        contactSub: 'Für Großbestellungen und individuelle Preislisten stehen wir Ihnen gerne zur Verfügung.',
        dietary: 'Qualitätsmerkmale', flavors: 'Geschmack', logistics: 'Logistikklasse',
        certifications: 'Zertifikate & Qualitätssiegel',
        orderInfo: 'Bestellinformation',
        moq: 'Mindestbestellmenge', delivery: 'Lieferzeit', validity: 'Mindesthaltbarkeit',
        validityAfterOpen: 'Nach Öffnung',
        storage: 'Lagerung', origin: 'Herkunftsland', manufacturer: 'Hersteller',
        datasheet: 'Produktdatenblatt herunterladen',
        ingredients: 'Zutaten / Inhaltsstoffe',
        allergens: 'Allergene (gem. LMIV Anhang II)',
        allergenContains: 'Enthält:', allergenTraces: 'Kann Spuren enthalten von:',
        nutritionTitle: 'Nährwertangaben',
        nutritionPer100: 'je 100 g',
        nutritionPerPortion: 'je Portion',
        portionSize: 'Portionsgröße',
        energy: 'Brennwert', fat: 'Fett', saturated: 'davon gesättigte Fettsäuren',
        carbs: 'Kohlenhydrate', sugars: 'davon Zucker', fiber: 'Ballaststoffe',
        protein: 'Eiweiß', salt: 'Salz',
        werktage: 'Werktage', months: 'Monate', days: 'Tage',
        tiefkuehl: 'Tiefkühlware (≤ −18 °C)', kuehlware: 'Kühlware', ambient: 'Trocken / Ambient',
        noAllergen: 'Keine deklarationspflichtigen Allergene.',
    },
    tr: {
        category: 'Kategori', sku: 'Ürün Kodu', ean: 'EAN / GTIN',
        description: 'Ürün Açıklaması', specs: 'Teknik Özellikler',
        packaging: 'Ambalaj & Lojistik',
        unit: 'Birim', box: 'Kutu', case: 'Koli', pallet: 'Palet',
        weight: 'Ağırlık', volume: 'Hacim',
        contact: 'Fiyat Teklifi İste',
        contactSub: 'Toptan siparişler ve fiyat listesi için bizimle iletişime geçin.',
        dietary: 'Kalite Özellikleri', flavors: 'Lezzet', logistics: 'Lojistik Sınıfı',
        certifications: 'Sertifikalar & Kalite Belgeleri',
        orderInfo: 'Sipariş Bilgileri',
        moq: 'Minimum Sipariş', delivery: 'Teslimat Süresi', validity: 'Son Kullanma',
        validityAfterOpen: 'Açıldıktan Sonra',
        storage: 'Depolama', origin: 'Menşei Ülke', manufacturer: 'Üretici',
        datasheet: 'Ürün Veri Sayfasını İndir',
        ingredients: 'İçindekiler',
        allergens: 'Alerjenler (LMIV Ek II)',
        allergenContains: 'İçerir:', allergenTraces: 'İz miktarda içerebilir:',
        nutritionTitle: 'Besin Değerleri',
        nutritionPer100: '100 g başına',
        nutritionPerPortion: 'Porsiyon başına',
        portionSize: 'Porsiyon büyüklüğü',
        energy: 'Enerji', fat: 'Yağ', saturated: 'doymuş yağ asitleri',
        carbs: 'Karbonhidrat', sugars: 'şeker', fiber: 'Lif',
        protein: 'Protein', salt: 'Tuz',
        werktage: 'iş günü', months: 'ay', days: 'gün',
        tiefkuehl: 'Derin Dondurulmuş (≤ −18 °C)', kuehlware: 'Soğutulmuş', ambient: 'Kuru / Oda Sıcaklığı',
        noAllergen: 'Beyan edilmesi gereken alerjen bulunmamaktadır.',
    },
    en: {
        category: 'Category', sku: 'SKU', ean: 'EAN / GTIN',
        description: 'Product Description', specs: 'Technical Details',
        packaging: 'Packaging & Logistics',
        unit: 'Unit', box: 'Box', case: 'Case', pallet: 'Pallet',
        weight: 'Weight', volume: 'Volume',
        contact: 'Request a Quote',
        contactSub: 'Contact us for bulk orders and custom price lists.',
        dietary: 'Quality Features', flavors: 'Flavors', logistics: 'Logistics Class',
        certifications: 'Certifications & Quality Labels',
        orderInfo: 'Order Information',
        moq: 'Min. Order Qty.', delivery: 'Delivery Time', validity: 'Best Before',
        validityAfterOpen: 'After Opening',
        storage: 'Storage', origin: 'Country of Origin', manufacturer: 'Manufacturer',
        datasheet: 'Download Product Datasheet',
        ingredients: 'Ingredients',
        allergens: 'Allergens (LMIV Annex II)',
        allergenContains: 'Contains:', allergenTraces: 'May contain traces of:',
        nutritionTitle: 'Nutritional Values',
        nutritionPer100: 'per 100 g',
        nutritionPerPortion: 'per portion',
        portionSize: 'Portion size',
        energy: 'Energy', fat: 'Fat', saturated: 'of which saturated',
        carbs: 'Carbohydrates', sugars: 'of which sugars', fiber: 'Dietary fibre',
        protein: 'Protein', salt: 'Salt',
        werktage: 'working days', months: 'months', days: 'days',
        tiefkuehl: 'Frozen (≤ −18 °C)', kuehlware: 'Chilled', ambient: 'Dry / Ambient',
        noAllergen: 'No declarable allergens.',
    },
    ar: {
        category: 'الفئة', sku: 'SKU', ean: 'EAN / GTIN',
        description: 'وصف المنتج', specs: 'تفاصيل تقنية',
        packaging: 'التعبئة والتغليف',
        unit: 'وحدة', box: 'صندوق', case: 'كرتون', pallet: 'بالتة',
        weight: 'الوزن', volume: 'الحجم',
        contact: 'طلب عرض سعر',
        contactSub: 'اتصل بنا لطلبات الجملة وقوائم الأسعار المخصصة.',
        dietary: 'ميزات الجودة', flavors: 'النكهات', logistics: 'فئة الخدمات اللوجستية',
        certifications: 'الشهادات',
        orderInfo: 'معلومات الطلب',
        moq: 'الحد الأدنى للطلب', delivery: 'وقت التوصيل', validity: 'صالح حتى',
        validityAfterOpen: 'بعد الفتح',
        storage: 'التخزين', origin: 'بلد المنشأ', manufacturer: 'الشركة المصنعة',
        datasheet: 'تحميل ورقة البيانات',
        ingredients: 'المكونات',
        allergens: 'مسببات الحساسية',
        allergenContains: 'يحتوي على:', allergenTraces: 'قد يحتوي على آثار من:',
        nutritionTitle: 'القيم الغذائية',
        nutritionPer100: 'لكل 100 جم',
        nutritionPerPortion: 'لكل حصة',
        portionSize: 'حجم الحصة',
        energy: 'الطاقة', fat: 'الدهون', saturated: 'منها مشبعة',
        carbs: 'الكربوهيدرات', sugars: 'منها سكريات', fiber: 'الألياف',
        protein: 'البروتين', salt: 'الملح',
        werktage: 'أيام عمل', months: 'أشهر', days: 'أيام',
        tiefkuehl: 'مجمد (≤ −18 °C)', kuehlware: 'مبرد', ambient: 'جاف / درجة حرارة الغرفة',
        noAllergen: 'لا توجد مسببات حساسية.',
    },
};

const dirs = ['de', 'tr', 'en', 'ar'];

dirs.forEach(lang => {
    const p = path.resolve('src/dictionaries', `${lang}.ts`);
    let content = fs.readFileSync(p, 'utf-8');
    
    // Check if it already has productDetail
    if (content.includes('productDetail: {')) {
        console.log(`${lang}.ts already has productDetail`);
        return;
    }

    const dictBlock = `  productDetail: ${JSON.stringify(T[lang], null, 4).replace(/\n/g, '\n  ')},\n`;
    
    // Insert right before the last closing brace
    const lastBraceIndex = content.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
        content = content.substring(0, lastBraceIndex) + ',\n' + dictBlock + content.substring(lastBraceIndex);
        fs.writeFileSync(p, content, 'utf-8');
        console.log(`Updated ${lang}.ts`);
    } else {
        console.error(`Could not find closing brace in ${lang}.ts`);
    }
});
