import pdfplumber
import json
import os

pdf_files = [
    r"dokuments\Fo Fiyat Listeleri\Fo 2026 Fiyat Listesi.pdf",
    r"dokuments\Fo Fiyat Listeleri\proforma.pdf",
    r"dokuments\Fo Fiyat Listeleri\ELYSONSWEETS FİYAT ÇALIŞMASI 06.05.2026 (1).pdf"
]

for p in pdf_files:
    if os.path.exists(p):
        print(f"=== {p} ===")
        with pdfplumber.open(p) as pdf:
            print(f"Total pages: {len(pdf.pages)}")
            for i in range(min(2, len(pdf.pages))):
                text = pdf.pages[i].extract_text()
                lines = text.split("\n")[:15] if text else []
                print(f"--- Page {i+1} sample ---")
                for line in lines:
                    print(line)
