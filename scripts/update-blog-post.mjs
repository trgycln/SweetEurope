import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const trContent = `<p>Almanya'da teras sezonu, gastronomi işletmeleri için açık bir gelir artırıcıdır. Güneş daha uzun süre parladıkça ve misafirler giderek daha fazla açık havada yemek yedikçe, hem ferahlatıcı hem de yüksek kaliteli lezzet deneyimleri arıyorlar. <strong>Botanik şuruplar</strong>, içecek menüsünü çeşitlendirmek, kâr marjını artırmak ve aynı zamanda sürdürülebilirlik ile doğal malzemeler gibi güncel trend temalarına hitap etmek için ideal bir fırsat sunar.</p>

<h2>Neden Botanik Şuruplar Yeni "Olmazsa Olmaz"?</h2>
<p>Botanik şuruplar, karmaşık ekstraksiyon süreçleriyle elde edilen otlar, çiçekler, meyveler ve baharatların kullanılmasıyla klasik şeker şuruplarından ayrılır. Bu bileşenler; kokteyllere, alkolsüz kokteyllere ve hatta özel kahvelere benzersiz bir aroma profili katar. Müşteriler için bu, <strong>daha yüksek bir lezzet deneyimi</strong>, işletmeciler için ise <strong>çok daha yüksek bir fiyatlandırma potansiyeli</strong> anlamına gelir. Üstelik temel bileşenler olan su ve şeker aynı kaldığı için üretim maliyetleri nispeten düşük kalır.</p>

<h3>Trend Analizi: Doğal Malzemeler ve Hikaye Anlatıcılığı</h3>
<p>Araştırmalar, Alman tüketicilerin %70'inden fazlasının içeceklerde doğal içeriklere dikkat ettiğini gösteriyor. Aynı zamanda ürünün arkasında bir hikaye olmasını istiyorlar. Botanik şuruplar, her içeceğe "Lavanta Yazı" veya "Biberiye-Narenciye Ferahlığı" gibi küçük bir anlatı kazandırmanızı sağlar. Bu hikaye anlatma unsuru, ödeme istekliliğini artırır ve marka sadakatini güçlendirir.</p>

<h2>Stratejik Fiyatlandırma ve Kâr Marjı</h2>
<p>Kârlılık için belirleyici bir faktör fiyatlandırma yapısıdır. Basit bir şeker şurubu içeren klasik bir long drink yaklaşık 3 € iken, yüksek kaliteli botanik şurup içeren bir kokteyl kolayca 5-6 €'ya mal olabilir. Bir şurubun <strong>hammadde maliyeti</strong> porsiyon başına genellikle 0,30 € ile 0,50 € arasındayken, satış fiyatı dört ila altı katına ulaşabilir. Fiyattaki bu net farklılaşma sayesinde <strong>%80'e varan</strong> kâr marjları elde edebilirsiniz.</p>

<h3>Barista AI Reçete Asistanı ile Kolay Hesaplama</h3>
<p>Porsiyon başına optimum şurup miktarını belirlemek ve aynı zamanda maliyetleri kontrol altında tutmak için dijital araçların kullanılması önerilir. <a href="/tr/barista-ai" class="text-blue-600 font-semibold hover:underline">Barista AI Reçete Asistanı</a>, malzeme fiyatlarınızı analiz eder, ideal şurup oranını hesaplar ve aynı zamanda size yaratıcı reçete varyasyonları önerir. Böylece aşırı veya yetersiz dozlamayı önler ve kâr marjınızı maksimize edersiniz.</p>

<h2>Ürün Tedariki – Kalite, Güvenilirlik, Ölçeklenebilirlik</h2>
<p>Tedarikçi seçimi, ürünün kendisi kadar önemlidir. <strong>FO Kokteyl Şurupları</strong>, gastronomi için özel olarak geliştirilmiş çok çeşitli botanik lezzetler sunar. Köklü bir üreticiyle ortaklık kurarak yalnızca tutarlı kalite elde etmekle kalmaz, aynı zamanda mevsimsel ihtiyaçlarınıza uyum sağlayan esnek teslimat miktarlarından da yararlanırsınız. Daha fazla bilgi için <a href="/tr/products/fo" class="text-blue-600 font-semibold hover:underline">FO Kokteyl Şurupları</a> sayfasını ziyaret edebilirsiniz.</p>

<h3>Lojistik ve Depolama</h3>
<p>Botanik şuruplar, yüksek şeker içerikleri sayesinde 12 aya kadar uzun bir raf ömrüne sahiptir. Bununla birlikte, aromatik nüansları korumak için serin ve karanlık bir yerde saklandıklarından emin olmalısınız. Tek bir tedarikçi üzerinden merkezi tedarik sayesinde, sipariş eforunu azaltır ve yoğun sezonda stoksuz kalma riskini en aza indirirsiniz.</p>

<h2>Menü Mühendisliği – Teklifte Doğru Konumlandırma</h2>
<p>İyi yapılandırılmış bir menü, her kârlı gastronomi işletmesinin kalbidir. Yeni şurup bazlı içecekleri, misafirlerin dikkatinin en yüksek olduğu içecek bölümünün üst üçte birlik kısmına yerleştirin. Botanik seçenekleri vurgulamak için küçük simgeler veya renkli arka planlar gibi <strong>görsel vurgular</strong> kullanın. Ek olarak, sınırlı mevcudiyeti olan mevsimsel spesiyaliteleri duyurabilirsiniz; bu aciliyet yaratır ve satışları artırır.</p>

<h3>Çapraz Satış (Cross-Selling) ve Üst Satış (Up-Selling)</h3>
<p>Servis personelinizi, şurup bazlı içecekleri aktif olarak önermeleri için eğitin. "Kokteylinizi ev yapımı biberiye şurubumuzla zenginleştirmek ister misiniz?" gibi basit bir cümle, ortalama sipariş değerini %15'e kadar artırabilir. Genel deneyimi güçlendirmek için bu teklifi uygun atıştırmalıklar veya hafif yaz yemekleriyle birleştirin.</p>

<h2>Pazarlama ve İletişim Stratejileri</h2>
<p>Yeni şurup kreasyonlarını sergilemek için sosyal medyayı kullanın. Şurubun buzun üzerine döküldüğü kısa videolar görsel çekicilik yaratır. Her zaman çevrimiçi menünüze bağlantı verin ve botanik malzemelerin <strong>sürdürülebilir kökenini</strong> vurgulayın. Bülteninizdeki haftalık bir "Şurup Odağı", müşteri sadakatini yüksek tutar ve tekrarlanan ziyaretleri teşvik eder.</p>

<h3>Etkinlikler ve Tadımlar</h3>
<p>Teras sezonunda, misafirlerin farklı şurup varyasyonlarını deneyebilecekleri küçük tadım etkinlikleri düzenleyin. Bu tür etkinlikler yalnızca farkındalığı artırmakla kalmaz, aynı zamanda daha fazla ürün geliştirmesi için size değerli geri bildirimler sağlar.</p>

<h2>Sonuç – Botanik Şuruplarla Sürdürülebilir Başarı</h2>
<p>Teras sezonu, <strong>yüksek kaliteli botanik şuruplarla</strong> yeni gelir potansiyelinin kilidini açmak için ideal bir ortam sunar. <a href="/tr/barista-ai" class="text-blue-600 font-semibold hover:underline">Barista AI Reçete Asistanı</a> ile hedeflenen fiyatlandırma, verimli reçete yönetimi ve <a href="/tr/products/fo" class="text-blue-600 font-semibold hover:underline">FO Kokteyl Şurupları</a> aracılığıyla güvenilir tedarik sayesinde kâr marjlarınızı önemli ölçüde artırabilirsiniz. İyi düşünülmüş bir menü ve pazarlama stratejisi ile birleştiğinde, yaz menünüz sadece daha kârlı olmakla kalmayacak, aynı zamanda misafirleriniz için gerçek bir çekim merkezi haline gelecektir.</p>`;

const enContent = `<p>The terrace season is a clear revenue driver for foodservice businesses in Germany. As the sun shines longer and guests increasingly dine outdoors, they are looking for refreshing yet high-quality flavor experiences. <strong>Botanical syrups</strong> offer an ideal opportunity to diversify the beverage menu, increase profit margins, and at the same time address current trend topics such as sustainability and natural ingredients.</p>

<h2>Why Botanical Syrups are the New Must-Have</h2>
<p>Botanical syrups differ from classic sugar syrups through the use of herbs, flowers, fruits, and spices that are extracted through complex processes. These ingredients give cocktails, mocktails, and even specialty coffees an unmistakable flavor profile. For customers, this means a <strong>higher flavor experience</strong> and for operators, a <strong>significantly higher pricing potential</strong> – while production costs remain relatively low since the base – water and sugar – remains unchanged.</p>

<h3>Trend Analysis: Natural Ingredients and Storytelling</h3>
<p>Studies show that over 70% of German consumers pay attention to natural ingredients in beverages. At the same time, they want a story behind the product. Botanical syrups allow you to give each drink a small narrative – such as "Lavender Summer" or "Rosemary-Citrus Refreshment". This storytelling component increases the willingness to pay and strengthens brand loyalty.</p>

<h2>Strategic Pricing and Margin</h2>
<p>A crucial factor for profitability is the pricing structure. While a classic long drink with simple sugar syrup is around €3, a cocktail with a high-quality botanical syrup can easily cost €5-6. The <strong>raw material costs</strong> for a syrup are usually between €0.30 and €0.50 per portion, while the selling price can reach four to six times that. Through this clear differentiation in price, you can achieve margins of <strong>up to 80%</strong>.</p>

<h3>Calculation Made Easy – with the Barista AI Recipe Assistant</h3>
<p>To determine the optimal amount of syrup per portion and at the same time keep costs under control, the use of digital tools is recommended. The <a href="/en/barista-ai" class="text-blue-600 font-semibold hover:underline">Barista AI Recipe Assistant</a> analyzes your ingredient prices, calculates the ideal syrup ratio, and suggests creative recipe variations at the same time. This helps you avoid over- or under-dosing and maximizes the profit margin.</p>

<h2>Product Sourcing – Quality, Reliability, Scalability</h2>
<p>The choice of supplier is just as important as the product itself. <strong>FO Cocktail Syrups</strong> offer a wide range of botanical flavors specifically developed for gastronomy. By partnering with an established manufacturer, you not only receive consistent quality but also flexible delivery quantities that adapt to your seasonal needs. For more information, visit <a href="/en/products/fo" class="text-blue-600 font-semibold hover:underline">FO Cocktail Syrups</a>.</p>

<h3>Logistics and Storage</h3>
<p>Botanical syrups have a long shelf life of up to 12 months thanks to their high sugar content. Nevertheless, you should ensure they are stored in a cool, dark place to preserve the aromatic nuances. By sourcing centrally through a single supplier, you reduce ordering effort and minimize the risk of out-of-stock situations during the peak season.</p>

<h2>Menu Engineering – The Right Placement in Your Offer</h2>
<p>A well-structured menu is the heart of every profitable foodservice business. Place the new syrup-based drinks in the top third of the beverage section, where guests' attention is highest. Use <strong>visual highlights</strong> such as small icons or colored backgrounds to mark the botanical options. In addition, you can communicate seasonal specials with limited availability – this creates urgency and increases sales.</p>

<h3>Cross-Selling and Up-Selling</h3>
<p>Train your service staff to actively recommend syrup-based drinks. A simple sentence like "Would you like to enhance your cocktail with our homemade rosemary syrup?" can increase the average order value by up to 15%. Combine this offer with matching snacks or light summer dishes to enhance the overall experience.</p>

<h2>Marketing and Communication Strategies</h2>
<p>Use social media to showcase the new syrup creations. Short videos in which the syrup is poured over ice create visual appeal. Always link to your online menu and emphasize the <strong>sustainable origin</strong> of the botanical ingredients. A weekly "Syrup Spotlight" in your newsletter keeps customer loyalty high and encourages repeat visits.</p>

<h3>Events and Tastings</h3>
<p>During the terrace season, organize small tasting events where guests can try different syrup variations. Such events not only increase awareness but also provide you with valuable feedback for further product development.</p>

<h2>Conclusion – Sustainable Success with Botanical Syrups</h2>
<p>The terrace season offers an ideal environment to unlock new revenue potential with <strong>high-quality botanical syrups</strong>. Through targeted pricing, efficient recipe management with the <a href="/en/barista-ai" class="text-blue-600 font-semibold hover:underline">Barista AI Recipe Assistant</a>, and reliable sourcing through <a href="/en/products/fo" class="text-blue-600 font-semibold hover:underline">FO Cocktail Syrups</a>, you can significantly increase your profit margins. Combined with a well-thought-out menu and marketing strategy, your summer menu will not only become more profitable but also a real eye-catcher for your guests.</p>`;

async function updatePost() {
  const { data: post, error: fetchError } = await supabase
    .from('blog_yazilari')
    .select('title, excerpt, content')
    .eq('id', 'e020617d-aa9c-4dfb-8661-60d0b99cbd97')
    .single();

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    process.exit(1);
  }

  const newTitle = { ...post.title, 
    tr: "Almanya'da Teras Sezonu: Botanik Şuruplar Yaz Menünüzü Nasıl Daha Kârlı Hale Getirir?",
    en: "Terrace Season in Germany: How Botanical Syrups Make Your Summer Menu More Profitable"
  };

  const newExcerpt = { ...post.excerpt, 
    tr: "Yüksek kaliteli botanik şuruplarla teras sezonunu nasıl değerlendirebileceğinizi, daha yüksek kâr marjları elde edebileceğinizi, trendleri belirleyip işletmenizi nasıl verimli bir şekilde yönetebileceğinizi keşfedin.",
    en: "Discover how to use high-quality botanical syrups to capitalize on the terrace season, achieve higher profit margins, set trends, and manage your business efficiently."
  };

  const newContent = { ...post.content, 
    tr: trContent,
    en: enContent
  };

  const { error: updateError } = await supabase
    .from('blog_yazilari')
    .update({ 
      title: newTitle, 
      excerpt: newExcerpt, 
      content: newContent 
    })
    .eq('id', 'e020617d-aa9c-4dfb-8661-60d0b99cbd97');

  if (updateError) {
    console.error('Update error:', updateError);
    process.exit(1);
  }

  console.log('Post updated successfully');
}

updatePost();
