import sys
import pdfplumber

pdf_document = "dokuments/Ürün Etiketleri/surup/FO KARAMEL SURUP-(sekerli).pdf"
text = ""
with pdfplumber.open(pdf_document) as pdf:
    for page in pdf.pages:
        text += page.extract_text() + "\n"
        
with open("scripts/test_pdfplumber_output.txt", "w", encoding="utf-8") as f:
    f.write(text)
