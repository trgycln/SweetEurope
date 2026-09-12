# scripts/harmonize_products_ai_studio.py
"""
Google AI Studio - Ürün Veri Harmonizasyonu ve Zenginleştirme Aracı
-------------------------------------------------------------------
Bu script, Supabase'deki 90 ürünü yerel Spekt DOC ve Etiket PDF dosyalarıyla eşleştirir.
Temperature 0 ile Google AI Studio (aistudio.google.com) veya Gemini API üzerinden:
1. Zengin B2B Ürün Açıklaması (aciklamalar: de, en, tr, ar)
2. Ürün Hazırlanışı & Karışım Oranı (hazirlanisi: de, en, tr, ar)
3. Kullanım Alanları (kullanim_alanlari: de, en, tr, ar)
4. Saklama Koşulları (saklama_kosullari: de, en, tr, ar)
5. Resmi İçindekiler ve Besin Değerleri (inhaltsstoffe, naehrwerte, allergene)
verilerini sıfır uydurma (zero hallucination) kuralıyla çeker ve hazırlar.
"""

import os
import sys
import glob
import json
import struct
import argparse
import requests
import fitz  # PyMuPDF
import olefile
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

PROMPT_DIR = 'data/ai_studio_prompts'
OUTPUT_DIR = 'data/harmonized_json'

os.makedirs(PROMPT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── 1. Doküman Okuma Fonksiyonları ─────────────────────────────────────────────

def read_pdf(pdf_path):
    if not os.path.exists(pdf_path):
        return ""
    try:
        doc = fitz.open(pdf_path)
        return "\n".join([page.get_text() for page in doc])
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
        return ""

def read_doc(doc_path):
    if not os.path.exists(doc_path):
        return ""
    if doc_path.endswith('.docx'):
        try:
            import docx
            doc = docx.Document(doc_path)
            return "\n".join([p.text for p in doc.paragraphs])
        except Exception:
            return ""
    try:
        ole = olefile.OleFileIO(doc_path)
        word_stream = ole.openstream('WordDocument').read()
        flags = struct.unpack_from('<H', word_stream, 0x000A)[0]
        table_stream = ole.openstream('1Table' if (flags & 0x0200) else '0Table').read()
        fcClx = struct.unpack_from('<I', word_stream, 0x01A2)[0]
        lcbClx = struct.unpack_from('<I', word_stream, 0x01A6)[0]
        clx = table_stream[fcClx : fcClx + lcbClx]
        pos = 0
        doc_text = ""
        while pos < len(clx):
            clxt = clx[pos]
            pos += 1
            if clxt == 1:
                pos += 2 + struct.unpack_from('<H', clx, pos)[0]
            elif clxt == 2:
                cb = struct.unpack_from('<I', clx, pos)[0]
                pos += 4
                plc = clx[pos : pos + cb]
                n = (cb - 4) // 12
                cps = [struct.unpack_from('<I', plc, i * 4)[0] for i in range(n + 1)]
                pcds_offset = (n + 1) * 4
                full = []
                for i in range(n):
                    fc_val = struct.unpack_from('<I', plc, pcds_offset + i * 8 + 2)[0]
                    cnt = cps[i+1] - cps[i]
                    fc = fc_val & 0x3FFFFFFF
                    if not (fc_val & 0x40000000):
                        full.append(word_stream[fc : fc + cnt * 2].decode('utf-16le', errors='ignore'))
                    else:
                        full.append(word_stream[fc//2 : fc//2 + cnt].decode('cp1252', errors='ignore'))
                doc_text = "".join(full)
                break
        ole.close()
        return doc_text
    except Exception as e:
        return ""

# ── 2. Eşleştirme Motoru ───────────────────────────────────────────────────────

def build_catalog():
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    url = f"{SUPABASE_URL}/rest/v1/urunler?select=id,ad,slug,stok_kodu,ean_gtin,teknik_ozellikler&aktif=eq.true&order=ad->>tr.asc"
    res = requests.get(url, headers=headers)
    products = res.json()

    spec_files = glob.glob('dokuments/FO Ürün Spektleri/88_Kalem_Ilk_Parti_Siparis_Spektleri/*.doc*')
    label_files = glob.glob('dokuments/Ürün Etiketleri/**/*.pdf', recursive=True)

    catalog = []
    for p in products:
        name_tr = (p.get('ad', {}).get('tr') or '').lower()
        name_en = (p.get('ad', {}).get('en') or '').lower()
        name_de = (p.get('ad', {}).get('de') or '').lower()
        slug = p.get('slug', '')
        tekniks = p.get('teknik_ozellikler') or {}
        spec_name = tekniks.get('spec_file')

        # Find best matching spec file
        matched_spec = None
        if spec_name:
            for sf in spec_files:
                if os.path.basename(sf).lower() == spec_name.lower():
                    matched_spec = sf
                    break
        if not matched_spec:
            for sf in spec_files:
                base = os.path.splitext(os.path.basename(sf))[0].lower()
                # strip leading numbers
                base_clean = base.split('.', 1)[-1].strip() if '.' in base[:4] else base
                words = [w for w in base_clean.split(' ') if len(w) > 3 and w not in ['syrup', 'sauce', 'flavored', 'sugar', 'drink', 'premium']]
                if words and all(w in name_en or w in name_tr for w in words[:2]):
                    matched_spec = sf
                    break

        # Find best matching label file
        matched_label = None
        for lf in label_files:
            lbase = os.path.splitext(os.path.basename(lf))[0].lower().replace('_', '-').replace(' ', '-')
            # search with slug or key tokens
            tokens = [t for t in slug.split('-') if len(t) > 3 and t not in ['fo', 'sirup', 'sauce', 'aroma', 'flasche']]
            if tokens and sum(1 for t in tokens if t in lbase) >= 2:
                matched_label = lf
                break

        catalog.append({
            'product': p,
            'spec_path': matched_spec,
            'label_path': matched_label
        })

    return catalog

# ── 3. Google AI Studio System Instructions & Schema ───────────────────────────

SYSTEM_INSTRUCTION = """You are a precision food scientist, barista master, and multilingual B2B catalog copywriter for ElysonSweets (Germany).
Your task is to harmonize, verify, and write rich, authoritative B2B product documentation from the provided Product Specification (.doc) and Official Label (.pdf).

ABSOLUTE RULES (TEMPERATURE 0):
1. ZERO HALLUCINATION for technical, ingredients, allergen, and nutritional data: Only use information stated in the source documents. If not present, output null.
2. In 'aciklamalar': Write a rich, professional, mouth-watering B2B description (3-4 comprehensive sentences) highlighting flavor profile, high concentration, mouthfeel, and benefits for cafes/bars. Provide in 'de', 'en', 'tr', 'ar'.
3. In 'hazirlanisi': Provide precise mixing ratios, dilution instructions, and barista recipes (e.g. for cold drinks, cocktails, mocktails, ice usage, pump dosages) in 'de', 'en', 'tr', 'ar'.
4. In 'kullanim_alanlari': Provide a comprehensive list of usage areas (cocktails, lemonades, smoothies, ice tea, desserts, coffees) in 'de', 'en', 'tr', 'ar'.
5. In 'saklama_kosullari': Provide exact storage and shelf-life guidance in 'de', 'en', 'tr', 'ar'.
6. In 'inhaltsstoffe': Provide exact ingredients in 'de', 'en', 'tr'.
7. In 'allergene': Provide boolean map of EU 14 allergens.
8. In 'naehrwerte': Provide exact nutritional values per 100g/100ml.

Output ONLY valid JSON matching the exact schema below. No markdown formatting outside the JSON, no extra text."""

JSON_SCHEMA = {
    "aciklamalar": {
        "de": "string (Reichhaltige B2B Produktbeschreibung)",
        "en": "string (Rich B2B product description)",
        "tr": "string (Zengin B2B ürün açıklaması)",
        "ar": "string (وصف غني للمنتج)"
    },
    "hazirlanisi": {
        "de": "string (Genaue Dosierung & Barista Zubereitungsempfehlung, z.B. 1 Teil Basis + 4 Teile Wasser/Eis)",
        "en": "string (Precise dosage & preparation instructions, e.g. 1 part base + 4 parts water/ice)",
        "tr": "string (Kesin dozaj ve barista hazırlama talimatı, örn: 1 ölçü baz + 4 ölçü su ve bol buz)",
        "ar": "string (طريقة التحضير الدقيقة والجرعة)"
    },
    "kullanim_alanlari": {
        "de": "string (Vielseitige Einsatzbereiche: Cocktails, Mocktails, Eistees, Limonaden, Desserts)",
        "en": "string (Versatile application areas: Cocktails, mocktails, iced teas, lemonades, desserts)",
        "tr": "string (Geniş kullanım alanları: Kokteyller, mocktail, soğuk çaylar, limonatalar, tatlılar)",
        "ar": "string (مجالات الاستخدام المتنوعة)"
    },
    "saklama_kosullari": {
        "de": "string (Lagerungshinweise)",
        "en": "string (Storage instructions)",
        "tr": "string (Saklama koşulları)",
        "ar": "string (شروط التخزين)"
    },
    "inhaltsstoffe": {
        "de": "string | null",
        "en": "string | null",
        "tr": "string | null"
    },
    "naehrwerte": {
        "pro_100g": {
            "energie_kj": "number | null",
            "energie_kcal": "number | null",
            "fett": "number | null",
            "davon_gesaettigt": "number | null",
            "kohlenhydrate": "number | null",
            "davon_zucker": "number | null",
            "eiweiss": "number | null",
            "salz": "number | null"
        }
    },
    "allergene": {
        "gluten": "boolean",
        "milch": "boolean",
        "soja": "boolean",
        "nuesse": "boolean",
        "eier": "boolean"
    }
}

# ── 4. Main Execution ──────────────────────────────────────────────────────────

def generate_prompts(catalog):
    print(f"\n📁 Generating Google AI Studio Prompt Files for {len(catalog)} products...")
    for idx, item in enumerate(catalog, 1):
        p = item['product']
        name_tr = p.get('ad', {}).get('tr') or ''
        name_de = p.get('ad', {}).get('de') or ''
        name_en = p.get('ad', {}).get('en') or ''
        slug = p.get('slug', f"product_{idx}")

        spec_txt = read_doc(item['spec_path']) if item['spec_path'] else "No spec file found."
        label_txt = read_pdf(item['label_path']) if item['label_path'] else "No label PDF found."

        prompt_content = f"""=== GOOGLE AI STUDIO INSTRUCTION ===
Temperature: 0
Model: Gemini 2.5 Pro or Gemini 1.5 Pro (or Gemini 3.8/3.5 Flash)

--- SYSTEM INSTRUCTIONS ---
{SYSTEM_INSTRUCTION}

--- EXPECTED JSON SCHEMA ---
{json.dumps(JSON_SCHEMA, indent=2, ensure_ascii=False)}

--- PRODUCT TO HARMONIZE ---
Product ID: {p.get('id')}
Name TR: {name_tr}
Name DE: {name_de}
Name EN: {name_en}
Barcode (EAN): {p.get('ean_gtin')}
SKU: {p.get('stok_kodu')}

[SOURCE 1: OFFICIAL SPECIFICATION (.DOC)]
{spec_txt}

[SOURCE 2: OFFICIAL PRODUCT LABEL (.PDF)]
{label_txt}
"""
        filepath = os.path.join(PROMPT_DIR, f"{idx:02d}_{slug}.txt")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(prompt_content)

    print(f"✅ Created {len(catalog)} ready-to-run prompt files in '{PROMPT_DIR}/'.")

def import_json(target_path):
    files_to_import = []
    if os.path.isdir(target_path):
        files_to_import = glob.glob(os.path.join(target_path, '*.json'))
    elif os.path.isfile(target_path):
        files_to_import = [target_path]

    if not files_to_import:
        print(f"❌ No JSON files found in {target_path}")
        return

    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

    print(f"\n🚀 Importing {len(files_to_import)} harmonized product files into Supabase...")
    for fpath in files_to_import:
        with open(fpath, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except Exception as e:
                print(f"❌ Error parsing {fpath}: {e}")
                continue

        product_id = data.get('product_id')
        slug = data.get('slug')

        if not product_id and not slug:
            # Try guessing from filename
            base = os.path.splitext(os.path.basename(fpath))[0]
            slug = base.split('_', 1)[-1] if '_' in base[:4] else base

        # Fetch current record
        query = f"id=eq.{product_id}" if product_id else f"slug=eq.{slug}"
        get_res = requests.get(f"{SUPABASE_URL}/rest/v1/urunler?{query}", headers=headers)
        current = get_res.json()
        if not current:
            print(f"⚠️ Product not found for {query}")
            continue

        p = current[0]
        pid = p['id']
        existing_tekniks = p.get('teknik_ozellikler') or {}

        # Merge fields
        if data.get('hazirlanisi'):
            existing_tekniks['hazirlanisi'] = data['hazirlanisi']
        if data.get('kullanim_alanlari'):
            existing_tekniks['kullanim_alanlari'] = data['kullanim_alanlari']
        if data.get('saklama_kosullari'):
            existing_tekniks['saklama_kosullari'] = data['saklama_kosullari']

        update_payload = {
            'teknik_ozellikler': existing_tekniks
        }
        if data.get('aciklamalar'):
            update_payload['aciklamalar'] = data['aciklamalar']
        if data.get('inhaltsstoffe'):
            update_payload['inhaltsstoffe'] = data['inhaltsstoffe']
        if data.get('naehrwerte'):
            update_payload['naehrwerte'] = data['naehrwerte']
        if data.get('allergene'):
            update_payload['allergene'] = data['allergene']

        patch_res = requests.patch(
            f"{SUPABASE_URL}/rest/v1/urunler?id=eq.{pid}",
            headers=headers,
            json=update_payload
        )
        if patch_res.status_code in [200, 204]:
            print(f"✅ Updated: {p.get('ad', {}).get('tr') or slug}")
        else:
            print(f"❌ Failed updating {slug}: {patch_res.text}")

def run_api(limit=None, slug_filter=None):
    gemini_key = os.getenv('GEMINI_API_KEY')
    if not gemini_key:
        print("❌ GEMINI_API_KEY not found in .env.local")
        return

    prompt_files = sorted(glob.glob(os.path.join(PROMPT_DIR, '*.txt')))
    if slug_filter:
        prompt_files = [f for f in prompt_files if slug_filter in f]
    if limit:
        prompt_files = prompt_files[:limit]

    print(f"\n⚡ Running automated Google AI Studio extraction for {len(prompt_files)} products...")
    print(f"Model: gemini-3.1-flash-lite (Temperature: 0)\n")

    models_to_try = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest']
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    import time

    for idx, pf in enumerate(prompt_files, 1):
        filename = os.path.splitext(os.path.basename(pf))[0]
        json_output_path = os.path.join(OUTPUT_DIR, f"{filename}.json")
        
        print(f"[{idx}/{len(prompt_files)}] Processing {filename}...")

        parsed_result = None

        # Check if already processed
        if os.path.exists(json_output_path) and os.path.getsize(json_output_path) > 100:
            try:
                with open(json_output_path, 'r', encoding='utf-8') as jf:
                    parsed_result = json.load(jf)
                print(f"   ⏩ Loaded existing verified JSON from {json_output_path}")
            except Exception:
                parsed_result = None

        if not parsed_result:
            with open(pf, 'r', encoding='utf-8') as f:
                prompt_content = f.read()

            payload = {
                'contents': [{'parts': [{'text': prompt_content}]}],
                'generationConfig': {
                    'temperature': 0,
                    'responseMimeType': 'application/json'
                }
            }

            success = False
            for attempt in range(3):
                for model in models_to_try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
                    try:
                        res = requests.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=90)
                        if res.status_code == 200:
                            rdata = res.json()
                            text = rdata['candidates'][0]['content']['parts'][0]['text']
                            start_brace = text.find('{')
                            if start_brace != -1:
                                decoder = json.JSONDecoder()
                                parsed_result, _ = decoder.raw_decode(text[start_brace:])
                            else:
                                parsed_result = json.loads(text)
                            success = True
                            break
                        elif res.status_code in [429, 503]:
                            print(f"   ⚠️ {model} returned {res.status_code}, backing off for 8s...")
                            time.sleep(8)
                        else:
                            print(f"   ❌ {model} error: {res.status_code} - {res.text[:120]}")
                    except Exception as e:
                        print(f"   ⚠️ Request error ({model}): {e}")
                        time.sleep(3)
                if success:
                    break

            if not success or not parsed_result:
                print(f"❌ Failed to process {filename}")
                time.sleep(2)
                continue

            # Save JSON output
            with open(json_output_path, 'w', encoding='utf-8') as jf:
                json.dump(parsed_result, jf, indent=2, ensure_ascii=False)

        # Update Supabase with retry
        for sb_attempt in range(3):
            try:
                slug = filename.split('_', 1)[-1]
                get_res = requests.get(f"{SUPABASE_URL}/rest/v1/urunler?slug=eq.{slug}", headers=headers, timeout=20)
                rows = get_res.json()
                if rows:
                    p = rows[0]
                    pid = p['id']
                    existing_tekniks = p.get('teknik_ozellikler') or {}

                    if parsed_result.get('hazirlanisi'):
                        existing_tekniks['hazirlanisi'] = parsed_result['hazirlanisi']
                    if parsed_result.get('kullanim_alanlari'):
                        existing_tekniks['kullanim_alanlari'] = parsed_result['kullanim_alanlari']
                    if parsed_result.get('saklama_kosullari'):
                        existing_tekniks['saklama_kosullari'] = parsed_result['saklama_kosullari']

                    update_payload = {'teknik_ozellikler': existing_tekniks}
                    if parsed_result.get('aciklamalar'):
                        update_payload['aciklamalar'] = parsed_result['aciklamalar']
                    if parsed_result.get('inhaltsstoffe'):
                        update_payload['inhaltsstoffe'] = parsed_result['inhaltsstoffe']
                    if parsed_result.get('naehrwerte'):
                        update_payload['naehrwerte'] = parsed_result['naehrwerte']
                    if parsed_result.get('allergene'):
                        update_payload['allergene'] = parsed_result['allergene']

                    patch_res = requests.patch(
                        f"{SUPABASE_URL}/rest/v1/urunler?id=eq.{pid}",
                        headers=headers,
                        json=update_payload,
                        timeout=20
                    )
                    if patch_res.status_code in [200, 204]:
                        print(f"   ✅ Successfully enriched & saved to Supabase: {p.get('ad', {}).get('tr') or slug}")
                    else:
                        print(f"   ❌ DB Update failed: {patch_res.text[:100]}")
                else:
                    print(f"   ⚠️ Product not found in DB with slug: {slug}")
                break
            except Exception as sbe:
                print(f"   ⚠️ Supabase connection retry {sb_attempt+1}: {sbe}")
                time.sleep(2)

        time.sleep(2.5)  # Polite pause between requests to prevent rate limiting

    print(f"\n🎉 Finished processing batch!")

def main():
    parser = argparse.ArgumentParser(description="Google AI Studio Product Harmonization Tool")
    parser.add_argument('--generate-prompts', action='store_true', help="Generate ready-to-use prompt files for Google AI Studio")
    parser.add_argument('--import-json', help="Import a harmonized JSON file or folder back into Supabase")
    parser.add_argument('--run-api', action='store_true', help="Run automated extraction directly using Gemini API (Temperature: 0)")
    parser.add_argument('--limit', type=int, help="Limit number of products to process")
    parser.add_argument('--filter', type=str, help="Filter products by slug or keyword")
    args = parser.parse_args()

    if args.import_json:
        import_json(args.import_json)
        return

    if args.run_api:
        run_api(limit=args.limit, slug_filter=args.filter)
        return

    catalog = build_catalog()
    print(f"Loaded {len(catalog)} active products from Supabase.")
    matched_specs = sum(1 for c in catalog if c['spec_path'])
    matched_labels = sum(1 for c in catalog if c['label_path'])
    print(f"Matched Spec Documents: {matched_specs} / {len(catalog)}")
    print(f"Matched Label PDFs: {matched_labels} / {len(catalog)}")

    generate_prompts(catalog)

if __name__ == '__main__':
    main()
