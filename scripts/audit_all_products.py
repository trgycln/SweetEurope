import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

# Load current supabase products
with open('scripts/current_supabase_products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Load factory price list items
with open('scripts/factory_price_list_items.json', 'r', encoding='utf-8') as f:
    factory_items = json.load(f)

# Load proforma items
with open('scripts/proforma_packaging.json', 'r', encoding='utf-8') as f:
    proforma_items = json.load(f)

proforma_by_barcode = {p['barcode']: p for p in proforma_items}

def normalize_str(s):
    if not s:
        return ""
    s = s.lower()
    s = s.replace('ı', 'i').replace('ö', 'o').replace('ü', 'u').replace('ş', 's').replace('ç', 'c').replace('ğ', 'g')
    s = re.sub(r'[^a-z0-9]', '', s)
    return s

audit_results = []

for p in products:
    p_id = p['id']
    barcode = p.get('ean_gtin')
    stok_kodu = p.get('stok_kodu')
    ad = p.get('ad', {})
    if isinstance(ad, dict):
        name_tr = ad.get('tr', '')
        name_de = ad.get('de', '')
        name_en = ad.get('en', '')
    else:
        name_tr = str(ad)
        name_de = str(ad)
        name_en = str(ad)

    cur_koli = p.get('koli_ici_adet')
    cur_palet = p.get('palet_ici_adet')
    teknik = p.get('teknik_ozellikler') or {}
    cur_tek_koli = teknik.get('koli_ici_adet')
    cur_tek_palet = teknik.get('palet_ici_koli')

    # Standard factory packaging rules:
    # 1. 700 ml Şurup (Syrup): Koli 6, Palet 125
    # 2. 800 ml Antik Seri: Koli 6, Palet 125
    # 3. 2.5 kg Sos (Chocolate, White Chocolate, Caramel, Taro): Koli 6, Palet 60
    # 4. 1 kg Meyveli / Dondurma Sosu (Püre, Fruit Sauce): Koli 6, Palet 170
    # 5. 1 kg Toz İçecek / Milkshake / Frappe / Latte: Koli 6, Palet 90
    # 6. 750 gr Dekor Sos: Koli 12, Palet 120
    # 7. 100 ml Köpürtücü (KOI): Koli 12, Palet 100
    # 8. 940 gr Antep Fıstıklı Special / 1 kg Eclipse Madagascar Vanilla: Koli 6, Palet 170
    
    # Let's determine standard based on category / product name / barcode
    expected_koli = 6
    expected_palet_koli = 125
    category_group = "700ml Şurup"

    combined_name = f"{stok_kodu} {name_tr} {name_de} {name_en}".lower()

    if "koi" in combined_name or "kopurtucu" in combined_name or "100 ml" in combined_name:
        expected_koli = 12
        expected_palet_koli = 100
        category_group = "100ml Köpürtücü"
    elif "750" in combined_name or "dekor" in combined_name:
        expected_koli = 12
        expected_palet_koli = 120
        category_group = "750gr Dekor Sos"
    elif "2,5" in combined_name or "2.5" in combined_name or "taro" in combined_name:
        expected_koli = 6
        expected_palet_koli = 60
        category_group = "2.5kg Sos"
    elif any(w in combined_name for w in ["toz", "powder", "milkshake", "frappe", "latte", "quatro", "matcha", "chai"]):
        expected_koli = 6
        expected_palet_koli = 90
        category_group = "1kg Toz İçecek"
    elif any(w in combined_name for w in ["dondurma", "ice cream", "fruited sauce", "pure", "puree", "meyveli sos", "sorrel", "madagascar", "popping candy", "pistachio verde", "special"]):
        expected_koli = 6
        expected_palet_koli = 170
        category_group = "1kg Meyveli/Dondurma Sos"
    elif any(w in combined_name for w in ["apollo", "dionysos", "dionysus", "zeus", "helios", "herakles", "heracles", "800"]):
        expected_koli = 6
        expected_palet_koli = 125
        category_group = "800ml Antik Seri"
    else:
        # Default: 700 ml Şurup
        expected_koli = 6
        expected_palet_koli = 125
        category_group = "700ml Şurup"

    # Check against proforma if exists
    prof = proforma_by_barcode.get(barcode)
    prof_koli = prof['each_box'] if prof else None
    prof_order = prof['box_order'] if prof else None

    # Audit flag
    koli_match = (cur_koli == expected_koli)
    palet_match = (cur_palet == expected_palet_koli)

    audit_results.append({
        "id": p_id,
        "stok_kodu": stok_kodu,
        "barcode": barcode,
        "name_tr": name_tr,
        "category_group": category_group,
        "cur_koli": cur_koli,
        "expected_koli": expected_koli,
        "koli_match": koli_match,
        "cur_palet": cur_palet,
        "expected_palet_koli": expected_palet_koli,
        "palet_match": palet_match,
        "prof_order_qty": prof_order
    })

print(f"Total products audited: {len(audit_results)}")

koli_mismatches = [r for r in audit_results if not r['koli_match']]
palet_mismatches = [r for r in audit_results if not r['palet_match']]

print(f"\nKoli İçi Adet Uyuşmazlıkları: {len(koli_mismatches)} / {len(audit_results)}")
for m in koli_mismatches:
    print(f"  {m['stok_kodu']} | {m['name_tr']} | Mevcut: {m['cur_koli']} -> Beklenen: {m['expected_koli']}")

print(f"\nPalet İçi Koli Uyuşmazlıkları: {len(palet_mismatches)} / {len(audit_results)}")
for m in palet_mismatches[:15]:
    print(f"  {m['stok_kodu']} | {m['name_tr']} | Mevcut: {m['cur_palet']} (Sipariş: {m['prof_order_qty']}) -> Beklenen: {m['expected_palet_koli']} koli")

with open('scripts/packaging_audit_results.json', 'w', encoding='utf-8') as f:
    json.dump(audit_results, f, ensure_ascii=False, indent=2)

print("\nSaved full audit to scripts/packaging_audit_results.json")
