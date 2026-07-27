import fitz # PyMuPDF
import json
import glob
import os
import re

def parse_nutrition_table(page):
    blocks = page.get_text("dict")["blocks"]
    texts_with_coords = []
    
    for b in blocks:
        if "lines" in b:
            for l in b["lines"]:
                for s in l["spans"]:
                    text = s["text"].strip()
                    if text:
                        y_center = (s["bbox"][1] + s["bbox"][3]) / 2
                        texts_with_coords.append({
                            "text": text,
                            "y": y_center
                        })
    
    # Group by Y coordinate (tolerance 3.0 points)
    texts_with_coords.sort(key=lambda item: item["y"])
    
    rows = []
    current_row = []
    current_y = None
    
    for item in texts_with_coords:
        if current_y is None:
            current_row.append(item["text"])
            current_y = item["y"]
        elif abs(item["y"] - current_y) <= 3.0:
            current_row.append(item["text"])
        else:
            rows.append(current_row)
            current_row = [item["text"]]
            current_y = item["y"]
    if current_row:
        rows.append(current_row)
        
    # Find nutrition rows
    nutrition = {}
    
    for row in rows:
        row_text = " ".join(row).lower()
        
        # Helper to extract value
        def extract_val(r):
            for part in r:
                clean_part = part.lower().strip()
                # Only match if it has digits, and ends with unit or has unit as word
                if bool(re.search(r'\d', clean_part)) and bool(re.search(r'(?:\d|\s)(g|kj|kcal|mg)\b', clean_part)):
                    return part
            return None

        val = extract_val(row)
        if not val: continue
        
        if "reference" in row_text or "referans" in row_text or "bazı" in row_text:
            continue
        
        if "enerji" in row_text or "energy" in row_text:
            nutrition["enerji"] = val
        elif "doymuş" in row_text or "saturates" in row_text:
            nutrition["doymus_yag"] = val
        elif "yağ" in row_text or "fat" in row_text:
            if "doymuş" not in row_text and "saturates" not in row_text:
                nutrition["yag"] = val
        elif "şeker" in row_text or "sugars" in row_text:
            nutrition["seker"] = val
        elif "karbonhidrat" in row_text or "carbohydrate" in row_text:
            nutrition["karbonhidrat"] = val
        elif "protein" in row_text:
            nutrition["protein"] = val
        elif "tuz" in row_text or "salt" in row_text or "sodium" in row_text:
            nutrition["tuz"] = val
            
    return nutrition

def parse_pdf(filepath):
    doc = fitz.open(filepath)
    page = doc[0]
    
    # 1. Linear text for ingredients & usage
    linear_text = page.get_text("text")
    
    # Try to find product name (usually near the top or from filename)
    filename = os.path.basename(filepath)
    
    # Extract Ingredients (making it more robust)
    en_ing = re.search(r'INGREDIENTS:\s*(.*?)(?=\n[A-ZÖÜĞŞÇİ ]+:|\n[A-Z][a-z]|\n\s*\n|Production Date|CONSIGNE|ANWENDUNG|LUGARES)', linear_text, re.DOTALL)
    tr_ing = re.search(r'(?:‹Ç‹NDEK‹LER:|İÇİNDEKİLER:|İÇİNDEKİLER)\s*(.*?)(?=\n[A-ZÖÜĞŞÇİ ]+:|\n[A-Z][a-z]|\n\s*\n|Üretim Tarihi)', linear_text, re.DOTALL)
    de_ing = re.search(r'(?:ZUTATEN:|ZUTATEN)\s*(.*?)(?=\n[A-ZÖÜĞŞÇİ ]+:|\n[A-Z][a-z]|\n\s*\n|ANWENDUNG|Herstellungsdatum)', linear_text, re.DOTALL)
    
    ingredients = {}
    if tr_ing: ingredients["tr"] = re.sub(r'\s+', ' ', tr_ing.group(1)).strip()
    if en_ing: ingredients["en"] = re.sub(r'\s+', ' ', en_ing.group(1)).strip()
    if de_ing: ingredients["de"] = re.sub(r'\s+', ' ', de_ing.group(1)).strip()

    # Extract Usage (Turkish)
    usage = re.search(r'(?:KULLANILDI⁄I YERLER VE KULLANMA TAL‹MATI:|KULLANIM ŞEKLİ:|KULLANILDIĞI YERLER)\s*(.*?)(?=\n[A-ZÖÜĞŞÇİ ]+:|\n\s*\n|СИРОП|CARAMEL|ZUTATEN|INDICE|SIROP)', linear_text, re.DOTALL)
    usage_text = ""
    if usage:
        usage_text = re.sub(r'\s+', ' ', usage.group(1)).strip()
        
    # Extract Storage (Turkish)
    storage = re.search(r'(Güneş ışığından uzakta[^\n]+saklayınız|Serin ve kuru[^\n]+saklayınız|Serin, kuru ve kokusuz[^\n]+muhafaza ediniz)', linear_text, re.IGNORECASE)
    storage_text = ""
    if storage:
        storage_text = re.sub(r'\s+', ' ', storage.group(1)).strip()
        
    # 2. Nutrition Table via Coordinates
    nutrition = parse_nutrition_table(page)
    
    doc.close()
    
    return {
        "filename": filename,
        "ingredients": ingredients,
        "usage": usage_text,
        "storage": storage_text,
        "nutrition": nutrition
    }

def main():
    pdf_files = glob.glob("dokuments/Ürün Etiketleri/**/*.pdf", recursive=True)
    results = []
    
    print(f"Found {len(pdf_files)} PDF files.")
    
    for f in pdf_files:
        try:
            data = parse_pdf(f)
            results.append(data)
            print(f"Processed: {data['filename']}".encode('ascii', 'replace').decode('ascii'))
        except Exception as e:
            print(f"Error processing {f}: {e}".encode('ascii', 'replace').decode('ascii'))
            
    with open("parsed_labels.json", "w", encoding="utf-8") as out:
        json.dump(results, out, ensure_ascii=False, indent=2)
        
    print(f"Saved {len(results)} parsed labels to parsed_labels.json")

if __name__ == "__main__":
    main()
