import pdfplumber
import json
import re
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')


pdf_files = [
    'dokuments/Fo Fiyat Listeleri/ELYSONSWEETS FİYAT ÇALIŞMASI 06.05.2026 (1).pdf',
    'dokuments/Fo Fiyat Listeleri/Fo Fiyat Listesi 05.05.2026 (Yeni Ürünler Eklenmis).pdf',
    'dokuments/Fo Fiyat Listeleri/Fo 2026 Fiyat Listesi.pdf'
]

products = {}

for pdf_path in pdf_files:
    if not os.path.exists(pdf_path):
        continue
        
    print(f"Parsing {pdf_path}...")
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue
                
            for line in text.split('\n'):
                # Look for lines ending with two prices like € 1 ,98 € 1,46
                # or € 1,98 € 1,46 or € 7 ,65
                match = re.search(r'(.*?)\s+€\s*(\d+\s*[\.,]\d+)\s+€\s*(\d+\s*[\.,]\d+)\s*$', line)
                if match:
                    name = match.group(1).strip()
                    price1_str = match.group(2).replace(' ', '').replace(',', '.')
                    price2_str = match.group(3).replace(' ', '').replace(',', '.')
                    
                    try:
                        price1 = float(price1_str)
                        price2 = float(price2_str)
                        
                        # Use lowercase for matching
                        clean_name = name.lower()
                        # If we already have it, we might prefer the first file's price since it's the latest
                        if clean_name not in products:
                            products[clean_name] = {
                                'original_name': name,
                                'price1': price1,
                                'price2': price2
                            }
                    except ValueError:
                        pass

with open('scratch_pdf_prices.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, indent=2, ensure_ascii=False)

print(f"Extracted {len(products)} products from PDFs.")
