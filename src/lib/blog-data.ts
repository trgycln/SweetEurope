export interface BlogPost {
    slug: string;
    title: { tr: string; en: string; de: string };
    excerpt: { tr: string; en: string; de: string };
    content: { tr: string; en: string; de: string };
    date: string;
    author: string;
    image: string;
    tags: string[];
}

export const BLOG_POSTS: BlogPost[] = [
    {
        slug: 'kafeler-icin-en-iyi-kahve-suruplari-neden-fo',
        title: {
            tr: 'Kafeler İçin En İyi Kahve Şurupları: Neden Fo Tercih Edilmeli?',
            en: 'The Best Coffee Syrups for Cafes: Why Choose Fo?',
            de: 'Die besten Kaffeesirupe für Cafés: Warum Fo wählen?'
        },
        excerpt: {
            tr: 'Birinci sınıf kafelerin ve profesyonel baristaların imza içecekler yaratırken neden Fo markasını tercih ettiğini keşfedin.',
            en: 'Discover why premium cafes and professional baristas choose the Fo brand when creating signature drinks.',
            de: 'Entdecken Sie, warum erstklassige Cafés und professionelle Baristas bei der Kreation von Signature-Drinks die Marke Fo bevorzugen.'
        },
        content: {
            tr: `
<h2>Kahve Şuruplarında Kalitenin Önemi</h2>
<p>Modern kafe kültüründe müşteriler artık sadece standart bir kahve içmekten öte, eşsiz ve akılda kalıcı deneyimler arıyorlar. Bu noktada devreye, sıradan bir kahveyi "imza içeceğe" dönüştüren <strong>kaliteli kahve şurupları</strong> giriyor. Baristalar için şurup, bir ressamın paletindeki en önemli renk gibidir.</p>

<h2>Neden Fo Markası?</h2>
<p>1988 yılında Fümer adıyla sektöre adım atan ve bugün Özmer A.Ş. çatısı altında dünya çapında bir dev haline gelen <strong>Fo</strong> markası, 100'den fazla ülkeye ihraç edilerek küresel bir standart belirlemiştir.</p>
<ul>
    <li><strong>Yüksek Konsantrasyon:</strong> Fo şurupları yoğun aromaya sahiptir, bu sayede az miktarda şurupla maksimum lezzet elde edilir.</li>
    <li><strong>El Değmeden Üretim:</strong> Son teknoloji laboratuvarlarda, tamamen hijyenik koşullarda üretilir.</li>
    <li><strong>Doğal Renk ve Tat:</strong> Kahvenin dokusunu bozmadan, istenen o doğal karamel, vanilya veya fındık tadını mükemmel şekilde yansıtır.</li>
</ul>

<h2>En Çok Tercih Edilen Fo Aromaları</h2>
<p>Kafelerde en hızlı tükenen ve müşterilerin favorisi olan aromalar şunlardır:</p>
<ol>
    <li><strong>Karamel Şurubu:</strong> Caramel Macchiato ve Frappelerin vazgeçilmezi.</li>
    <li><strong>Vanilya Şurubu:</strong> Yumuşak içim arayanların ilk tercihi.</li>
    <li><strong>Fındık (Hazelnut) Şurubu:</strong> Sütlü kahvelerle muhteşem uyumuyla klasikleşmiş bir tat.</li>
    <li><strong>İrlanda Kremi (Irish Cream):</strong> Daha yoğun ve spesifik kahve tarifleri için ideal.</li>
</ol>

<h2>ElysonSweets ile Almanya'da Toptan Tedarik</h2>
<p>Eğer Almanya'da bir kafe, otel veya pastane işletiyorsanız, orijinal Fo kahve şuruplarını toptan ve en uygun fiyatlarla <strong>ElysonSweets</strong> üzerinden temin edebilirsiniz. Hızlı lojistik ağımızla bu efsanevi lezzetleri işletmenize ulaştırıyoruz.</p>
            `,
            en: `<p>English content for the blog post about Fo Syrups.</p>`,
            de: `<p>German content for the blog post about Fo Syrups.</p>`
        },
        date: '2023-11-15',
        author: 'ElysonSweets Team',
        image: '/img/pattern.svg', // Placeholder, we can replace it later
        tags: ['Kahve', 'Barista', 'Fo Şurup', 'HORECA']
    }
];
