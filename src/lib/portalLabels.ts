// src/lib/portalLabels.ts
// Müşteri portali için ortak (4-dilli) etiket sözlüğü.
// Sözlük dosyalarını şişirmemek için self-contained.

export type Locale = 'de' | 'en' | 'tr' | 'ar';

type LabelSet = {
    // Cockpit
    welcome: string;
    customerSince: string;
    year: string;
    months: string;
    days: string;
    customerLabel: string;
    tierPlatinum: string;
    tierGold: string;
    tierSilver: string;
    tierBronze: string;
    tierNew: string;
    nextLevel: string;
    nextLevelRemaining: string;

    // KPI
    yearTotal: string;
    nOrders: string;
    activeOrders: string;
    inProgress: string;
    myFavorites: string;
    view: string;
    yourBenefits: string;
    discount: string;
    paymentTerm: string;
    customerHealth: string;
    healthActive: string;
    healthRegular: string;
    healthWarning: string;
    healthRisk: string;
    healthInactive: string;
    daysAgo: string;
    noOrders: string;

    // Quick actions
    quickActions: string;
    newOrder: string;
    fromFavorites: string;
    sampleRequest: string;
    contact: string;

    // Sections
    activeOrdersTitle: string;
    allLink: string;
    noActiveOrders: string;
    placeNewOrder: string;
    announcements: string;
    announcementCampaign: string;
    announcement: string;
    noAnnouncements: string;
    frequentProducts: string;
    oneClickReorder: string;
    fullCatalog: string;
    newProducts: string;
    last30Days: string;
    newBadge: string;
    bestseller: string;
    perBox: string;
    seeNow: string;
    pendingBalance: string;
    nOpenInvoices: string;

    // Banner
    promoBannerCta: string;
    pendingFromYou: string;

    // Favoriler
    favoritesTitle: string;
    favoritesSubtitle: string;
    favoritesEmpty: string;
    favoritesEmptyHint: string;
    goCatalog: string;
    searchFavorites: string;
    bulkOrderInfo: string;
    bulkOrderInfoDesc: string;
    addToCart: string;
    boxes: string;
    selectedItems: string;
    totalBoxes: string;
    estimatedTotal: string;
    excludingVat: string;
    clear: string;
    createOrder: string;
    removeFromFavorites: string;
    inListAlready: string;
    inList: string;
    add: string;
    stockOnRequest: string;
    boxItem: string;

    // Hesap Özetim
    accountSummary: string;
    accountSubtitle: string;
    overdueWarning: string;
    overduePaymentContact: string;
    upcomingPayment: string;
    upcomingHint: string;
    contactBtn: string;
    yearNet: string;
    avgBasket: string;
    perOrder: string;
    last12MonthsTrend: string;
    monthlyNet: string;
    noOrdersIn12Months: string;
    paymentSchedule: string;
    order: string;
    dueDate: string;
    status: string;
    amountGross: string;
    daysOverdue: string;
    daysLeft: string;
    totalOpen: string;
    yearOrders: string;
    noOrdersThisYear: string;
    date: string;
    net: string;
    gross: string;
    totalOf: string;
    orders: string;

    // Misc
    backToHome: string;
};

const TR: LabelSet = {
    welcome: 'Hoşgeldiniz',
    customerSince: 'Müşterimizsiniz',
    year: 'yıl',
    months: 'ay',
    days: 'gün',
    customerLabel: 'Müşteri',
    tierPlatinum: 'Platin',
    tierGold: 'Altın',
    tierSilver: 'Gümüş',
    tierBronze: 'Bronz',
    tierNew: 'Yeni Müşteri',
    nextLevel: 'seviyesine',
    nextLevelRemaining: 'Sonraki seviyeye',

    yearTotal: 'Bu Yıl Toplam',
    nOrders: 'sipariş',
    activeOrders: 'Aktif Sipariş',
    inProgress: 'Süreçte olan',
    myFavorites: 'Favorilerim',
    view: 'Görüntüle',
    yourBenefits: 'Avantajlarınız',
    discount: 'indirim',
    paymentTerm: 'Ödeme vadesi',
    customerHealth: 'Müşteri Sağlığı',
    healthActive: 'Aktif',
    healthRegular: 'Düzenli',
    healthWarning: 'Uyarı',
    healthRisk: 'Risk',
    healthInactive: 'Pasif',
    daysAgo: 'gün önce',
    noOrders: 'Sipariş yok',

    quickActions: 'Hızlı İşlemler',
    newOrder: 'Yeni Sipariş',
    fromFavorites: 'Favorilerimden',
    sampleRequest: 'Numune Talep',
    contact: 'İletişim',

    activeOrdersTitle: 'Aktif Siparişlerim',
    allLink: 'Tümü',
    noActiveOrders: 'Şu an aktif siparişiniz yok',
    placeNewOrder: 'Yeni Sipariş Ver',
    announcements: 'Duyurular & Kampanyalar',
    announcementCampaign: 'Kampanya',
    announcement: 'Duyuru',
    noAnnouncements: 'Yeni duyuru yok',
    frequentProducts: 'Sık Aldığınız Ürünler',
    oneClickReorder: '1-tıkla yeniden sipariş',
    fullCatalog: 'Tüm Katalog',
    newProducts: 'Yeni Eklenen Ürünler',
    last30Days: 'Son 30 gün',
    newBadge: 'YENİ',
    bestseller: 'En Çok Satanlar',
    perBox: 'adet/koli',
    seeNow: 'Hemen İncele',
    pendingBalance: 'Açık Bakiye',
    nOpenInvoices: 'açık fatura',

    promoBannerCta: 'Hemen İncele',
    pendingFromYou: 'açık siparişim bizden bekliyor',

    favoritesTitle: 'Favorilerim',
    favoritesSubtitle: 'Hızlıca seçim yapıp toplu sipariş oluştur',
    favoritesEmpty: 'Henüz favori ürününüz yok',
    favoritesEmptyHint: 'Katalog sayfasında ürünleri ❤️ ikonuna tıklayarak favorilerinize ekleyin.',
    goCatalog: 'Kataloga Git',
    searchFavorites: 'Favori ara...',
    bulkOrderInfo: 'Toplu Sipariş:',
    bulkOrderInfoDesc: 'İstediğiniz ürünlerden +/− ile koli sayısı belirleyin. Aşağıdaki "Sipariş Oluştur" butonu ile seçtiklerinizi sepete ekleyin.',
    addToCart: 'Sepete Ekle',
    boxes: 'koli',
    selectedItems: 'ürün seçili',
    totalBoxes: 'koli toplam',
    estimatedTotal: 'Tahmini tutar:',
    excludingVat: '(KDV hariç)',
    clear: 'Temizle',
    createOrder: 'Sipariş Oluştur',
    removeFromFavorites: 'Favorilerden çıkar',
    inListAlready: 'Favori listesinde',
    inList: 'Listede',
    add: 'Ekle',
    stockOnRequest: 'Stoğa Bağlı',
    boxItem: 'koli',

    accountSummary: 'Hesap Özetim',
    accountSubtitle: 'Müşterimizsiniz',
    overdueWarning: 'Vadesi geçmiş ödemeniz mevcut',
    overduePaymentContact: 'Ödeme bilgileriniz için bizimle iletişime geçebilirsiniz.',
    upcomingPayment: 'gün içinde vadesi gelecek',
    upcomingHint: 'Vade durumlarınızı aşağıdaki tablodan takip edebilirsiniz.',
    contactBtn: 'İletişim',
    yearNet: 'Bu Yıl Net',
    avgBasket: 'Ort. Sepet',
    perOrder: 'Sipariş başına',
    last12MonthsTrend: 'Son 12 Ay Sipariş Trendi',
    monthlyNet: 'Aylık net tutar',
    noOrdersIn12Months: 'Son 12 ayda sipariş yok',
    paymentSchedule: 'Vade Takvimi',
    order: 'Sipariş',
    dueDate: 'Vade Tarihi',
    status: 'Durum',
    amountGross: 'Tutar (Brüt)',
    daysOverdue: 'gün gecikti',
    daysLeft: 'gün kaldı',
    totalOpen: 'Toplam Açık Bakiye:',
    yearOrders: 'Yıllık Sipariş Geçmişi',
    noOrdersThisYear: 'Bu yıl henüz sipariş yok',
    date: 'Tarih',
    net: 'Net',
    gross: 'Brüt',
    totalOf: 'sipariş toplam',
    orders: 'Siparişler',

    backToHome: 'Anasayfaya dön',
};

const DE: LabelSet = {
    welcome: 'Willkommen',
    customerSince: 'Sie sind Kunde seit',
    year: 'Jahr',
    months: 'Monaten',
    days: 'Tagen',
    customerLabel: 'Kunde',
    tierPlatinum: 'Platin',
    tierGold: 'Gold',
    tierSilver: 'Silber',
    tierBronze: 'Bronze',
    tierNew: 'Neuer Kunde',
    nextLevel: 'Stufe',
    nextLevelRemaining: 'Zur nächsten Stufe',

    yearTotal: 'Dieses Jahr',
    nOrders: 'Bestellungen',
    activeOrders: 'Aktive Bestellungen',
    inProgress: 'In Bearbeitung',
    myFavorites: 'Meine Favoriten',
    view: 'Ansehen',
    yourBenefits: 'Ihre Vorteile',
    discount: 'Rabatt',
    paymentTerm: 'Zahlungsziel',
    customerHealth: 'Kundenstatus',
    healthActive: 'Aktiv',
    healthRegular: 'Regelmäßig',
    healthWarning: 'Warnung',
    healthRisk: 'Risiko',
    healthInactive: 'Inaktiv',
    daysAgo: 'Tage her',
    noOrders: 'Keine Bestellungen',

    quickActions: 'Schnellzugriff',
    newOrder: 'Neue Bestellung',
    fromFavorites: 'Aus Favoriten',
    sampleRequest: 'Musteranfrage',
    contact: 'Kontakt',

    activeOrdersTitle: 'Meine aktiven Bestellungen',
    allLink: 'Alle',
    noActiveOrders: 'Sie haben aktuell keine aktiven Bestellungen',
    placeNewOrder: 'Neue Bestellung aufgeben',
    announcements: 'Ankündigungen & Aktionen',
    announcementCampaign: 'Aktion',
    announcement: 'Ankündigung',
    noAnnouncements: 'Keine neuen Ankündigungen',
    frequentProducts: 'Häufig bestellte Produkte',
    oneClickReorder: 'Mit einem Klick erneut bestellen',
    fullCatalog: 'Zum Katalog',
    newProducts: 'Neu im Sortiment',
    last30Days: 'Letzte 30 Tage',
    newBadge: 'NEU',
    bestseller: 'Bestseller',
    perBox: 'Stk./Ktn.',
    seeNow: 'Jetzt entdecken',
    pendingBalance: 'Offener Saldo',
    nOpenInvoices: 'offene Rechnungen',

    promoBannerCta: 'Jetzt entdecken',
    pendingFromYou: 'offene Bestellungen warten auf uns',

    favoritesTitle: 'Meine Favoriten',
    favoritesSubtitle: 'Schnell auswählen und Sammelbestellung erstellen',
    favoritesEmpty: 'Sie haben noch keine Favoriten',
    favoritesEmptyHint: 'Klicken Sie im Katalog auf das ❤️ Symbol, um Produkte zu Ihren Favoriten hinzuzufügen.',
    goCatalog: 'Zum Katalog',
    searchFavorites: 'Favoriten suchen...',
    bulkOrderInfo: 'Sammelbestellung:',
    bulkOrderInfoDesc: 'Wählen Sie mit +/− die Anzahl der Kartons. Mit "Bestellung erstellen" werden Ihre Auswahl in den Warenkorb gelegt.',
    addToCart: 'In den Warenkorb',
    boxes: 'Kartons',
    selectedItems: 'Produkte ausgewählt',
    totalBoxes: 'Kartons gesamt',
    estimatedTotal: 'Geschätzte Summe:',
    excludingVat: '(zzgl. MwSt.)',
    clear: 'Zurücksetzen',
    createOrder: 'Bestellung erstellen',
    removeFromFavorites: 'Aus Favoriten entfernen',
    inListAlready: 'In Favoriten',
    inList: 'In Liste',
    add: 'Hinzufügen',
    stockOnRequest: 'Auf Anfrage',
    boxItem: 'Karton',

    accountSummary: 'Kontoübersicht',
    accountSubtitle: 'Sie sind unser Kunde',
    overdueWarning: 'Überfällige Zahlung vorhanden',
    overduePaymentContact: 'Bitte kontaktieren Sie uns für Zahlungsdetails.',
    upcomingPayment: 'Tage bis zur Fälligkeit',
    upcomingHint: 'Fälligkeitsstatus können Sie in der Tabelle unten verfolgen.',
    contactBtn: 'Kontakt',
    yearNet: 'Dieses Jahr (Netto)',
    avgBasket: 'Ø Warenkorb',
    perOrder: 'pro Bestellung',
    last12MonthsTrend: 'Bestelltrend der letzten 12 Monate',
    monthlyNet: 'Monatlicher Nettowert',
    noOrdersIn12Months: 'Keine Bestellungen in den letzten 12 Monaten',
    paymentSchedule: 'Zahlungsplan',
    order: 'Bestellung',
    dueDate: 'Fälligkeitsdatum',
    status: 'Status',
    amountGross: 'Betrag (Brutto)',
    daysOverdue: 'Tage überfällig',
    daysLeft: 'Tage übrig',
    totalOpen: 'Offener Saldo gesamt:',
    yearOrders: 'Bestellungen dieses Jahr',
    noOrdersThisYear: 'In diesem Jahr noch keine Bestellungen',
    date: 'Datum',
    net: 'Netto',
    gross: 'Brutto',
    totalOf: 'Bestellungen insgesamt',
    orders: 'Bestellungen',

    backToHome: 'Zur Startseite',
};

const EN: LabelSet = {
    welcome: 'Welcome',
    customerSince: 'Customer for',
    year: 'year',
    months: 'months',
    days: 'days',
    customerLabel: 'Customer',
    tierPlatinum: 'Platinum',
    tierGold: 'Gold',
    tierSilver: 'Silver',
    tierBronze: 'Bronze',
    tierNew: 'New Customer',
    nextLevel: 'tier',
    nextLevelRemaining: 'To next tier',

    yearTotal: 'This Year',
    nOrders: 'orders',
    activeOrders: 'Active Orders',
    inProgress: 'In progress',
    myFavorites: 'My Favorites',
    view: 'View',
    yourBenefits: 'Your Benefits',
    discount: 'discount',
    paymentTerm: 'Payment terms',
    customerHealth: 'Customer Health',
    healthActive: 'Active',
    healthRegular: 'Regular',
    healthWarning: 'Warning',
    healthRisk: 'Risk',
    healthInactive: 'Inactive',
    daysAgo: 'days ago',
    noOrders: 'No orders',

    quickActions: 'Quick Actions',
    newOrder: 'New Order',
    fromFavorites: 'From Favorites',
    sampleRequest: 'Sample Request',
    contact: 'Contact',

    activeOrdersTitle: 'My Active Orders',
    allLink: 'All',
    noActiveOrders: 'You have no active orders right now',
    placeNewOrder: 'Place New Order',
    announcements: 'Announcements & Promotions',
    announcementCampaign: 'Promotion',
    announcement: 'Announcement',
    noAnnouncements: 'No new announcements',
    frequentProducts: 'Frequently Ordered Products',
    oneClickReorder: '1-click reorder',
    fullCatalog: 'Full Catalog',
    newProducts: 'New Products',
    last30Days: 'Last 30 days',
    newBadge: 'NEW',
    bestseller: 'Bestsellers',
    perBox: 'pcs/box',
    seeNow: 'Discover Now',
    pendingBalance: 'Open Balance',
    nOpenInvoices: 'open invoices',

    promoBannerCta: 'Discover Now',
    pendingFromYou: 'open orders pending from us',

    favoritesTitle: 'My Favorites',
    favoritesSubtitle: 'Quickly select items and create a bulk order',
    favoritesEmpty: 'You have no favorites yet',
    favoritesEmptyHint: 'Click the ❤️ icon on products in the catalog to add to your favorites.',
    goCatalog: 'Go to Catalog',
    searchFavorites: 'Search favorites...',
    bulkOrderInfo: 'Bulk Order:',
    bulkOrderInfoDesc: 'Use +/− to set box quantities. Click "Create Order" to add selected items to your cart.',
    addToCart: 'Add to Cart',
    boxes: 'boxes',
    selectedItems: 'items selected',
    totalBoxes: 'total boxes',
    estimatedTotal: 'Estimated total:',
    excludingVat: '(excl. VAT)',
    clear: 'Clear',
    createOrder: 'Create Order',
    removeFromFavorites: 'Remove from favorites',
    inListAlready: 'In favorites',
    inList: 'In list',
    add: 'Add',
    stockOnRequest: 'Stock-bound',
    boxItem: 'box',

    accountSummary: 'Account Summary',
    accountSubtitle: 'You are our customer',
    overdueWarning: 'Overdue payment',
    overduePaymentContact: 'Please contact us for payment details.',
    upcomingPayment: 'days until due',
    upcomingHint: 'You can track due statuses in the table below.',
    contactBtn: 'Contact',
    yearNet: 'This Year (Net)',
    avgBasket: 'Avg. Basket',
    perOrder: 'per order',
    last12MonthsTrend: 'Last 12 Months Trend',
    monthlyNet: 'Monthly net amount',
    noOrdersIn12Months: 'No orders in the last 12 months',
    paymentSchedule: 'Payment Schedule',
    order: 'Order',
    dueDate: 'Due Date',
    status: 'Status',
    amountGross: 'Amount (Gross)',
    daysOverdue: 'days overdue',
    daysLeft: 'days left',
    totalOpen: 'Total Open Balance:',
    yearOrders: 'Yearly Order History',
    noOrdersThisYear: 'No orders this year',
    date: 'Date',
    net: 'Net',
    gross: 'Gross',
    totalOf: 'orders total',
    orders: 'Orders',

    backToHome: 'Back to home',
};

const AR: LabelSet = {
    welcome: 'مرحبا',
    customerSince: 'عميل منذ',
    year: 'سنة',
    months: 'شهور',
    days: 'أيام',
    customerLabel: 'عميل',
    tierPlatinum: 'بلاتيني',
    tierGold: 'ذهبي',
    tierSilver: 'فضي',
    tierBronze: 'برونزي',
    tierNew: 'عميل جديد',
    nextLevel: 'الفئة',
    nextLevelRemaining: 'للوصول إلى الفئة التالية',

    yearTotal: 'إجمالي هذا العام',
    nOrders: 'طلبات',
    activeOrders: 'الطلبات النشطة',
    inProgress: 'قيد التنفيذ',
    myFavorites: 'مفضلاتي',
    view: 'عرض',
    yourBenefits: 'مزاياك',
    discount: 'خصم',
    paymentTerm: 'مدة الدفع',
    customerHealth: 'حالة العميل',
    healthActive: 'نشط',
    healthRegular: 'منتظم',
    healthWarning: 'تحذير',
    healthRisk: 'خطر',
    healthInactive: 'غير نشط',
    daysAgo: 'يوم مضى',
    noOrders: 'لا توجد طلبات',

    quickActions: 'إجراءات سريعة',
    newOrder: 'طلب جديد',
    fromFavorites: 'من المفضلة',
    sampleRequest: 'طلب عينة',
    contact: 'اتصل',

    activeOrdersTitle: 'طلباتي النشطة',
    allLink: 'الكل',
    noActiveOrders: 'لا توجد طلبات نشطة حاليا',
    placeNewOrder: 'إنشاء طلب جديد',
    announcements: 'الإعلانات والعروض',
    announcementCampaign: 'عرض',
    announcement: 'إعلان',
    noAnnouncements: 'لا توجد إعلانات جديدة',
    frequentProducts: 'المنتجات الأكثر طلبا',
    oneClickReorder: 'أعد الطلب بنقرة واحدة',
    fullCatalog: 'الكتالوج الكامل',
    newProducts: 'منتجات جديدة',
    last30Days: 'آخر 30 يوم',
    newBadge: 'جديد',
    bestseller: 'الأكثر مبيعا',
    perBox: 'قطعة/علبة',
    seeNow: 'اكتشف الآن',
    pendingBalance: 'الرصيد المفتوح',
    nOpenInvoices: 'فاتورة مفتوحة',

    promoBannerCta: 'اكتشف الآن',
    pendingFromYou: 'طلبات معلقة منا',

    favoritesTitle: 'مفضلاتي',
    favoritesSubtitle: 'حدد بسرعة وأنشئ طلبا جماعيا',
    favoritesEmpty: 'لا توجد مفضلات بعد',
    favoritesEmptyHint: 'انقر على رمز ❤️ في الكتالوج لإضافة المنتج إلى المفضلة.',
    goCatalog: 'إلى الكتالوج',
    searchFavorites: 'بحث في المفضلة...',
    bulkOrderInfo: 'طلب جماعي:',
    bulkOrderInfoDesc: 'استخدم +/− لتحديد عدد العلب. انقر "إنشاء طلب" لإضافة المختار إلى السلة.',
    addToCart: 'أضف إلى السلة',
    boxes: 'علب',
    selectedItems: 'منتج محدد',
    totalBoxes: 'علب إجمالاً',
    estimatedTotal: 'الإجمالي التقديري:',
    excludingVat: '(غير شامل الضريبة)',
    clear: 'مسح',
    createOrder: 'إنشاء طلب',
    removeFromFavorites: 'إزالة من المفضلة',
    inListAlready: 'في المفضلة',
    inList: 'مضاف',
    add: 'أضف',
    stockOnRequest: 'حسب التوفر',
    boxItem: 'علبة',

    accountSummary: 'ملخص الحساب',
    accountSubtitle: 'أنت عميلنا',
    overdueWarning: 'دفعة متأخرة',
    overduePaymentContact: 'يرجى الاتصال بنا لتفاصيل الدفع.',
    upcomingPayment: 'أيام حتى الاستحقاق',
    upcomingHint: 'يمكنك متابعة حالة الاستحقاقات في الجدول أدناه.',
    contactBtn: 'اتصل',
    yearNet: 'هذا العام (صافي)',
    avgBasket: 'متوسط السلة',
    perOrder: 'لكل طلب',
    last12MonthsTrend: 'اتجاه آخر 12 شهر',
    monthlyNet: 'الصافي الشهري',
    noOrdersIn12Months: 'لا طلبات في آخر 12 شهر',
    paymentSchedule: 'جدول الدفعات',
    order: 'طلب',
    dueDate: 'تاريخ الاستحقاق',
    status: 'الحالة',
    amountGross: 'المبلغ (إجمالي)',
    daysOverdue: 'أيام تأخر',
    daysLeft: 'أيام متبقية',
    totalOpen: 'إجمالي الرصيد المفتوح:',
    yearOrders: 'سجل الطلبات السنوي',
    noOrdersThisYear: 'لا طلبات هذا العام',
    date: 'التاريخ',
    net: 'صافي',
    gross: 'إجمالي',
    totalOf: 'إجمالي الطلبات',
    orders: 'الطلبات',

    backToHome: 'العودة للرئيسية',
};

export function getPortalLabels(locale: string): LabelSet {
    switch (locale) {
        case 'de': return DE;
        case 'en': return EN;
        case 'ar': return AR;
        case 'tr':
        default: return TR;
    }
}

/**
 * Tarihi locale'e uygun şekilde formatlar.
 * Arapça için Latin/Hijri ay isimleri Intl ile otomatik.
 */
export function formatLocaleDate(d: Date | string, locale: string, opts?: Intl.DateTimeFormatOptions): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    const localeMap: Record<string, string> = {
        de: 'de-DE', en: 'en-US', tr: 'tr-TR', ar: 'ar-EG',
    };
    try {
        return date.toLocaleDateString(localeMap[locale] || 'de-DE', opts || { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return date.toLocaleDateString('de-DE', opts);
    }
}

/**
 * Para birimi formatı. Locale'a göre.
 */
export function formatCurrency(v: number | null | undefined, locale: string, opts?: { maximumFractionDigits?: number }): string {
    const localeMap: Record<string, string> = {
        de: 'de-DE', en: 'en-US', tr: 'tr-TR', ar: 'ar-EG',
    };
    return new Intl.NumberFormat(localeMap[locale] || 'de-DE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
    }).format(v ?? 0);
}

/**
 * RTL kontrolü (Arapça için)
 */
export function isRTL(locale: string): boolean {
    return locale === 'ar';
}
