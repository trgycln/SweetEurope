import sys
import pdfplumber

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"dokuments\Fo Fiyat Listeleri\Fo Fiyat Listesi 05.05.2026 (Yeni Ürünler Eklenmis).pdf"

with pdfplumber.open(pdf_path) as pdf:
    print(f"Pages: {len(pdf.pages)}")
    for i, p in enumerate(pdf.pages):
        text = p.extract_text()
        print(f"--- Page {i+1} ---")
        lines = text.split('\n')[:20] if text else []
        for l in lines:
            print(l)
