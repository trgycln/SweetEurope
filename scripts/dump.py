import sys
import fitz # PyMuPDF
import json
import glob
import os
import re

def parse_pdf(filepath):
    doc = fitz.open(filepath)
    page = doc[0]
    
    linear_text = page.get_text("text")
    
    with open("scripts/dump.txt", "w", encoding="utf-8") as f:
        f.write(linear_text)
        
    doc.close()

parse_pdf("dokuments/Ürün Etiketleri/surup/FO KARAMEL SURUP-(sekerli).pdf")
