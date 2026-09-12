import sys
import pdfplumber
import json
import re

# Set stdout to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"dokuments\Fo Fiyat Listeleri\Fo 2026 Fiyat Listesi.pdf"

items = []
with pdfplumber.open(pdf_path) as pdf:
    for page_idx, page in enumerate(pdf.pages):
        text = page.extract_text()
        if not text:
            continue
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            # Look for lines ending with numbers/prices or matching pattern:
            # e.g. "Fo Chocolate Flavored Powder Drink 1 kg. 6 90 € 5 ,70 € 4,56"
            # e.g. "Fo Mango Flavored Cocktail Syrup 700 ml. 6 125 € 3 ,26 € 2,61"
            m = re.search(r'^(.*?)\s+(\d+)\s+(\d+)\s+€', line)
            if m:
                name = m.group(1).strip()
                unit_per_box = int(m.group(2))
                box_per_pallet = int(m.group(3))
                items.append({
                    "page": page_idx + 1,
                    "name": name,
                    "unit_per_box": unit_per_box,
                    "box_per_pallet": box_per_pallet,
                    "line": line
                })

print(f"Parsed {len(items)} items from Fo 2026 Fiyat Listesi.pdf")

# Group by category / package type
categories = {}
for it in items:
    # identify pattern like 700 ml, 1 kg, 2,5 kg, 750 gr, etc.
    pkg = "Other"
    n_lower = it['name'].lower()
    if "700 ml" in n_lower or "syrup" in n_lower or "surup" in n_lower:
        pkg = "700 ml Şurup"
    elif "powder drink" in n_lower or "toz" in n_lower or "milkshake" in n_lower or "latte" in n_lower:
        pkg = "1 kg Toz İçecek"
    elif "ice cream sauce" in n_lower or "dondurma" in n_lower or "fruited sauce" in n_lower:
        pkg = "1 kg Meyveli / Dondurma Sosu"
    elif "2,5" in n_lower or "2.5" in n_lower:
        pkg = "2.5 kg Sos"
    elif "750" in n_lower:
        pkg = "750 gr Sos"
    elif "100 ml" in n_lower or "foamer" in n_lower or "koi" in n_lower:
        pkg = "100 ml Köpürtücü"
    elif "antik" in n_lower or "800 ml" in n_lower or any(g in n_lower for g in ["apollo", "zeus", "dionysos", "helios", "herakles"]):
        pkg = "800 ml Antik Seri"
    
    key = (pkg, it['unit_per_box'], it['box_per_pallet'])
    categories[key] = categories.get(key, 0) + 1

print("\n--- Summary by Package Type (Package Type, Unit Per Box, Box Per Pallet): Count ---")
for k, count in sorted(categories.items()):
    print(f"{k[0]} -> Koli İçi: {k[1]}, Palet İçi Koli: {k[2]} (Toplam Adet: {k[1]*k[2]}) | Ürün adedi: {count}")

with open("scripts/factory_price_list_items.json", "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)
