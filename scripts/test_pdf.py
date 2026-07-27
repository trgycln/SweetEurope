import sys
import fitz # PyMuPDF

pdf_document = "dokuments/Ürün Etiketleri/surup/FO KARAMEL SURUP-(sekerli).pdf"
doc = fitz.open(pdf_document)
text = ""
for page in doc:
    text += page.get_text()

with open("scripts/test_pdf_output.txt", "w", encoding="utf-8") as f:
    f.write(text)

doc.close()
