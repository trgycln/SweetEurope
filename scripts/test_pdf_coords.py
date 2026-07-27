import sys
import fitz # PyMuPDF
import json
import glob
import os
import re

def parse_pdf(filepath):
    doc = fitz.open(filepath)
    page = doc[0]
    
    # Extract blocks with coordinates
    blocks = page.get_text("dict")["blocks"]
    
    texts_with_coords = []
    for b in blocks:
        if "lines" in b:
            for l in b["lines"]:
                for s in l["spans"]:
                    text = s["text"].strip()
                    if text:
                        # y-center
                        y_center = (s["bbox"][1] + s["bbox"][3]) / 2
                        x_center = (s["bbox"][0] + s["bbox"][2]) / 2
                        texts_with_coords.append({
                            "text": text,
                            "x": x_center,
                            "y": y_center
                        })
    
    # Sort by Y coordinate first, then X coordinate
    texts_with_coords.sort(key=lambda item: (item["y"], item["x"]))
    
    with open("scripts/test_pdf_coords_output.txt", "w", encoding="utf-8") as f:
        for item in texts_with_coords:
            f.write(f"Y: {item['y']:.1f}, X: {item['x']:.1f} -> {item['text']}\n")
        
    doc.close()

parse_pdf("dokuments/Ürün Etiketleri/surup/FO KARAMEL SURUP-(sekerli).pdf")
