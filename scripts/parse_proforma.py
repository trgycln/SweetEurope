import sys
import pdfplumber
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"dokuments\Fo Fiyat Listeleri\proforma.pdf"

proforma_items = []
with pdfplumber.open(pdf_path) as pdf:
    for page_idx, page in enumerate(pdf.pages):
        text = page.extract_text()
        if not text:
            continue
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            # Look for barcode: 13 digits starting with 869
            m = re.search(r'^(869\d{10})\s+(\S+)\s+(.*?)\s+(\d+(?:[.,]\d+)?)\s+(\d+)\s+(\d+)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+', line)
            if m:
                barcode = m.group(1)
                gtip = m.group(2)
                desc = m.group(3)
                unit_kg = float(m.group(4).replace(',', '.'))
                each_box = int(m.group(5)) # Koli içi adet
                box_order = int(m.group(6)) # Sipariş koli
                net_kg = float(m.group(7).replace(',', '.'))
                gross_kg = float(m.group(8).replace(',', '.'))
                pallet_fraction = float(m.group(9).replace(',', '.')) # Palet kesri
                
                boxes_per_pallet = round(box_order / pallet_fraction) if pallet_fraction > 0 else 0
                
                proforma_items.append({
                    "barcode": barcode,
                    "desc": desc,
                    "unit_kg": unit_kg,
                    "each_box": each_box,
                    "box_order": box_order,
                    "pallet_fraction": pallet_fraction,
                    "boxes_per_pallet": boxes_per_pallet,
                    "total_pcs_pallet": boxes_per_pallet * each_box
                })

print(f"Parsed {len(proforma_items)} items from proforma.pdf\n")
for item in proforma_items:
    print(f"Barcode: {item['barcode']} | Desc: {item['desc']} | Koli İçi: {item['each_box']} | Palet Koli: {item['boxes_per_pallet']} | Palet Adet: {item['total_pcs_pallet']} (Sipariş: {item['box_order']} koli)")

with open("scripts/proforma_packaging.json", "w", encoding="utf-8") as f:
    json.dump(proforma_items, f, ensure_ascii=False, indent=2)
