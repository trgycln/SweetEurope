"""
PDF ürünlerini DB ürünleriyle karşılaştırır, eksik olanları bulur
ve INSERT SQL üretir.
"""
import sys, io, json, re, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── Veri yükle ────────────────────────────────────────────────────────────────
with open('scripts/pdf_products_structured.json', encoding='utf-8') as f:
    pdf_products = json.load(f)

# DB JSON - baş satırı temizlenmiş hali
with open('scripts/fo_urunler_final.json', encoding='utf-8') as f:
    content = f.read()
    # "[dotenv...]" satırını atla
    if content.lstrip().startswith('[dotenv') or content.lstrip().startswith('"[dotenv'):
        content = content[content.index('\n')+1:]
    db_products = json.loads(content)

print(f"PDF ürün sayısı: {len(pdf_products)}")
print(f"DB ürün sayısı:  {len(db_products)}")
print()

# ── Normalleştirme fonksiyonu ─────────────────────────────────────────────────
def normalize(text: str) -> str:
    """Karşılaştırma için metni normalleştir."""
    if not text:
        return ''
    text = text.upper().strip()
    # Özel karakterleri ASCII'ye dönüştür (Türkçe/Almanca)
    text = text.replace('İ','I').replace('Ş','S').replace('Ğ','G')
    text = text.replace('Ü','U').replace('Ö','O').replace('Ç','C')
    text = text.replace('Ä','A').replace('Ü','U').replace('Ö','O')
    # Noktalama, çoklu boşluk
    text = re.sub(r'[.,\-–_\/\(\)%]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    # Yaygın kısaltmalar
    text = text.replace('PASTE FOR PASTRY AND ICE CREAM','PASTE')
    text = text.replace('PASTE FOR PASTRY & ICE CREAM','PASTE')
    text = text.replace('FLAVORED SYRUP','SYRUP')
    text = text.replace('FLAVORED  SYRUP','SYRUP')
    text = text.replace('FLAVORED SAUCE','SAUCE')
    text = text.replace('FLAVORED  SAUCE','SAUCE')
    text = text.replace('FLAVORED POWDER DRINK','POWDER DRINK')
    text = text.replace('FLAVORED  POWDER DRINK','POWDER DRINK')
    text = text.replace('FRUITED SAUCE','PUREE')
    text = text.replace('ICE CREAM SAUCE WITH','ICE CREAM SAUCE')
    text = text.replace('ICE CREAM SAUCE  WITH','ICE CREAM SAUCE')
    text = text.replace('COCKTAIL MIX','COCKTAIL')
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def strip_fo(text: str) -> str:
    """'FO ' veya 'Fo ' önekini kaldır."""
    return re.sub(r'^[Ff][Oo]\s+', '', text).strip()

def best_match_score(pdf_norm: str, db_norm: str) -> float:
    """Basit benzerlik puanı: ortak kelime oranı."""
    pdf_words = set(pdf_norm.split())
    db_words  = set(db_norm.split())
    if not pdf_words or not db_words:
        return 0.0
    common = pdf_words & db_words
    return len(common) / max(len(pdf_words), len(db_words))

# ── DB ürünlerini normalleştir ────────────────────────────────────────────────
db_norms = []
for p in db_products:
    names = p.get('ad', {})
    # EN adını tercih et, yoksa TR
    en_name = names.get('en', '') or names.get('tr', '') or ''
    tr_name = names.get('tr', '') or ''
    db_norms.append({
        'id': p['id'],
        'tr': tr_name,
        'en': en_name,
        'norm_en': normalize(strip_fo(en_name)),
        'norm_tr': normalize(strip_fo(tr_name)),
    })

# ── PDF ürünlerini filtrele: sadece gerçek ürünler ───────────────────────────
SECTION_HEADERS = {
    'FO DECOR TOPPING SAUCES', 'FO TOPPING ICE CREAM SAUCES',
    'FO PROFESSIONAL CAFE-BAR SAUCES', 'FO BAR-SAUCE',
    'FO SPECIAL SAUCES', 'FO COCKTAIL MIXES', 'FO SILVERY SYRUPS',
    'FO SYRUP BASES', 'FO FOAMER', 'FO KOI COCTAIL FOAMER',
    'FO POPPING CANDY SAUCE-SPECIAL', 'FO BLUEBERRIES PIECES SAUCE',
    'FLAVORED DRINK BASE', 'FRUIT PUREE', 'FO PREMIUM SYRUPS',
}

def is_real_product(p):
    name = p['name'].strip()
    # Bölüm başlığı kontrolü
    for header in SECTION_HEADERS:
        if normalize(name).startswith(normalize(header)):
            # Koli değeri yoksa muhtemelen başlık
            if p['koli_ici_adet'] is None:
                return False
    # Ürün adı çok kısa
    if len(name) < 8:
        return False
    # Sayıyla başlıyor
    if re.match(r'^\d', name):
        return False
    return True

real_pdf_products = [p for p in pdf_products if is_real_product(p)]
print(f"Gerçek PDF ürün sayısı: {len(real_pdf_products)}")
print()

# ── Karşılaştır ───────────────────────────────────────────────────────────────
MATCH_THRESHOLD = 0.50

matched = []    # (pdf_product, db_product, score)
unmatched = []  # PDF'de olup DB'de olmayan ürünler

for pdf_p in real_pdf_products:
    pdf_name = pdf_p['name'].strip()
    pdf_norm = normalize(strip_fo(pdf_name))

    best_score = 0.0
    best_db    = None

    for db_p in db_norms:
        # EN normuna karşı karşılaştır
        s_en = best_match_score(pdf_norm, db_p['norm_en'])
        # TR normuna karşı karşılaştır
        s_tr = best_match_score(pdf_norm, db_p['norm_tr'])
        s = max(s_en, s_tr)
        if s > best_score:
            best_score = s
            best_db = db_p

    if best_score >= MATCH_THRESHOLD:
        matched.append((pdf_p, best_db, best_score))
    else:
        unmatched.append((pdf_p, best_db, best_score))

print(f"Eşleşen:  {len(matched)}")
print(f"Eşleşmeyen (DB'de olmayan): {len(unmatched)}")
print()

# ── Eşleşmeyen PDF ürünlerini listele ────────────────────────────────────────
print("=" * 90)
print("PDF'DE OLUP DB'DE OLMAYAN ÜRÜNLER:")
print("=" * 90)
for i, (pdf_p, best_db, score) in enumerate(unmatched):
    print(f"\n{i+1:3}. PDF Adı: {pdf_p['name']}")
    print(f"     koli={pdf_p.get('koli_ici_adet')} | palet={pdf_p.get('palet_ici_adet')}")
    if best_db:
        print(f"     En yakın DB eşi (skor={score:.2f}): {best_db['tr']}")
    else:
        print(f"     En yakın DB eşi: Yok (skor={score:.2f})")

# ── Sonuçları JSON'a kaydet ───────────────────────────────────────────────────
missing_products = []
for pdf_p, best_db, score in unmatched:
    missing_products.append({
        'pdf_name_en': pdf_p['name'].strip(),
        'koli_ici_adet': pdf_p.get('koli_ici_adet'),
        'palet_ici_adet': pdf_p.get('palet_ici_adet'),
        'closest_db_tr': best_db['tr'] if best_db else None,
        'match_score': round(score, 3),
    })

with open('scripts/missing_fo_products.json', 'w', encoding='utf-8') as f:
    json.dump(missing_products, f, ensure_ascii=False, indent=2)

print(f"\n\nEksik ürünler 'scripts/missing_fo_products.json' dosyasına kaydedildi.")
print(f"Toplam {len(missing_products)} eksik ürün bulundu.")
