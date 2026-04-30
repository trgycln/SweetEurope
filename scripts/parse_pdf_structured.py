"""
PDF'deki FO ürün listesini satır bazlı layout analizi ile parse eder.
Her satır: ürün adı | koli_ici_adet | palet_ici_adet
"""
import sys, json, re, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextBox, LTTextLine, LTChar

PDF_PATH = "dokuments/data/Fo 2026 Fiyat Listes.pdf"

# Her sayfadaki metin elemanlarını koordinatlarıyla topla
all_elements = []  # (page, y, x, text)

for page_num, page_layout in enumerate(extract_pages(PDF_PATH)):
    page_height = page_layout.height
    for element in page_layout:
        if isinstance(element, LTTextBox):
            for line in element:
                if isinstance(line, LTTextLine):
                    text = line.get_text().strip()
                    if not text:
                        continue
                    x0 = line.x0
                    # Sayfadan sayfaya sıralama için y'yi global hale getir
                    y_global = page_num * 10000 + (page_height - line.y1)
                    all_elements.append({
                        'page': page_num + 1,
                        'y': y_global,
                        'x': x0,
                        'text': text
                    })

# Y değerine göre sırala (yukarıdan aşağıya, sayfa sırasına göre)
all_elements.sort(key=lambda e: (e['page'], e['y']))

# X pozisyonuna göre kolon analizi:
# Kolon 1 (ürün adı): x < 320
# Kolon 2 (koli): 320 <= x < 390
# Kolon 3 (palet): 390 <= x < 460
# Kolon 4 (fiyat): x >= 460

# Önce tüm x pozisyonlarını incele
x_vals = sorted(set(round(e['x']) for e in all_elements))
print(f"Toplam eleman: {len(all_elements)}")
print(f"Benzersiz X pozisyonları (ilk 20): {x_vals[:20]}")
print()

# X eşiklerini belirle
PRODUCT_X_MAX  = 317
KOLI_X_MIN     = 317
KOLI_X_MAX     = 355
PALET_X_MIN    = 355
PALET_X_MAX    = 400
PRICE_X_MIN    = 400

# Satırları y'ye göre gruplara topla (birbirine yakın y'li elemanlar = aynı satır)
rows = []
Y_TOLERANCE = 3  # piksel tolerans

for elem in all_elements:
    placed = False
    for row in rows:
        if abs(row['y'] - elem['y']) < Y_TOLERANCE and row['page'] == elem['page']:
            row['elements'].append(elem)
            placed = True
            break
    if not placed:
        rows.append({'page': elem['page'], 'y': elem['y'], 'elements': [elem]})

# Her satırı kolonlara ayır
print(f"Toplam satır: {len(rows)}")
print()

# Ürün bazlı yapı oluştur
# Her ürünün adını ve koli/palet değerini bul
products = []

def is_product_name(text):
    """Fo veya FO ile başlayan ürün adları"""
    t = text.strip()
    return bool(re.match(r'^[Ff][Oo]\s', t) or re.match(r'^FO\s', t))

def is_number(text):
    """Sayısal değer mi?"""
    t = text.strip().replace(',', '.')
    try:
        float(t)
        return True
    except:
        return False

def is_section_header(text):
    """Büyük harf bölüm başlığı mı?"""
    t = text.strip()
    return t.isupper() and len(t) > 5 and not re.match(r'^[Ff][Oo]\s', t) and not re.match(r'^FO\s', t)

# Satır bazlı parse
for row in rows:
    elems = sorted(row['elements'], key=lambda e: e['x'])
    texts_with_x = [(e['x'], e['text']) for e in elems]

    # Ürün adı kolonunda ne var?
    product_col = [t for x, t in texts_with_x if x < PRODUCT_X_MAX]
    koli_col    = [t for x, t in texts_with_x if KOLI_X_MIN <= x < KOLI_X_MAX]
    palet_col   = [t for x, t in texts_with_x if PALET_X_MIN <= x < PALET_X_MAX]

    if not product_col:
        continue

    product_text = ' '.join(product_col).strip()

    if is_product_name(product_text):
        koli = None
        palet = None

        if koli_col and is_number(koli_col[0]):
            koli = int(float(koli_col[0].replace(',', '.')))
        if palet_col and is_number(palet_col[0]):
            palet = int(float(palet_col[0].replace(',', '.')))

        products.append({
            'name': product_text,
            'koli_ici_adet': koli,
            'palet_ici_adet': palet,
            'page': row['page']
        })

print(f"Bulunan ürün sayısı: {len(products)}")
print()
print("İlk 30 ürün:")
for i, p in enumerate(products[:30]):
    print(f"  {i+1:3}. {p['name'][:70]:<70} koli={p['koli_ici_adet']} palet={p['palet_ici_adet']}")

# JSON olarak kaydet
with open('scripts/pdf_products_structured.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False, indent=2)
print(f"\nKaydedildi: scripts/pdf_products_structured.json")

# Koli/palet değeri olmayan ürünleri göster
missing_data = [p for p in products if p['koli_ici_adet'] is None or p['palet_ici_adet'] is None]
print(f"\nKoli/palet verisi eksik: {len(missing_data)} ürün")
for p in missing_data[:10]:
    print(f"  {p['name'][:70]}")
