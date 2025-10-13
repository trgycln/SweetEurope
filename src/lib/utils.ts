// src/lib/utils.ts

// Bu dosya, proje genelinde kullanılacak yardımcı fonksiyonları barındırır.

/**
 * Çok dilli bir objeden veya metinden, belirtilen dile göre metin döndürür.
 * Her zaman bir string döndürmeyi garanti eder.
 */
export const getLocalizedName = (adObj: any, lang: 'de' | 'tr' | 'en' | 'ar' = 'de'): string => {
    let name: string | null = null;
    if (typeof adObj === 'object' && adObj !== null) {
        // Öncelik sırası: istenen dil -> Almanca -> Türkçe -> İngilizce -> Arapça
        name = adObj[lang] || adObj.de || adObj.tr || adObj.en || adObj.ar;
    } else if (typeof adObj === 'string') {
        name = adObj;
    }
    // Sonuç ne olursa olsun, String() ile metne çevirerek ve boşsa varsayılanı atayarak hatayı önle.
    return String(name || 'İsimsiz');
};

/**
 * Sayısal bir değeri, para birimi formatında metne çevirir.
 */
export const formatCurrency = (value: number | null | undefined, currency: 'EUR' | 'TRY' = 'EUR') => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat(currency === 'EUR' ? 'de-DE' : 'tr-TR', { 
        style: 'currency', 
        currency: currency 
    }).format(value);
};

/**
 * YENİ EKLENEN FONKSİYON
 * Bir metni, URL'de kullanılabilecek, SEO dostu bir "slug" formatına çevirir.
 * Örnek: "Fıstıklı Rüya Pasta" -> "fistikli-ruya-pasta"
 */
export function slugify(text: string): string {
  if (!text) return '';

  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Boşlukları - ile değiştir
    .replace(p, c => b.charAt(a.indexOf(c))) // Türkçe ve diğer özel karakterleri çevir
    .replace(/&/g, '-and-') // & karakterini '-and-' ile değiştir
    .replace(/[^\w\-]+/g, '') // Alfanümerik olmayan tüm karakterleri kaldır (tire hariç)
    .replace(/\-\-+/g, '-') // Birden fazla tireyi tek tire yap
    .replace(/^-+/, '') // Başlangıçtaki tireleri kaldır
    .replace(/-+$/, '') // Sondaki tireleri kaldır
}