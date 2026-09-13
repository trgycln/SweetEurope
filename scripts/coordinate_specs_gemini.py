import os
import sys
import json
import glob
import re
import urllib.request
from collections import defaultdict
from supabase import create_client, Client
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
GEMINI_KEY = os.getenv('GEMINI_API_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

if not GEMINI_KEY:
    print("❌ Missing GEMINI_API_KEY")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 1. Load parsed specs
with open('scratch/all_parsed_specs.json', 'r', encoding='utf-8') as f:
    specs = json.load(f)

# 2. Fetch all products from DB
res = supabase.table('urunler').select('id, ad, slug, stok_kodu, kategori_id, urun_gami, lojistik_sinifi').order('id').execute()
products = res.data or []
print(f"📦 Total products fetched from DB: {len(products)}")

import time

def call_gemini(prompt: str) -> dict:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={GEMINI_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.0,
            "responseMimeType": "application/json"
        }
    }
    data_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"})
    
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req) as resp:
                res_json = json.loads(resp.read().decode('utf-8'))
                raw_text = res_json['candidates'][0]['content']['parts'][0]['text']
                return json.loads(raw_text)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < 4:
                wait_sec = (attempt + 1) * 3
                print(f"⚠️ Gemini API returned {e.code}. Retrying in {wait_sec}s... (attempt {attempt+1}/5)")
                time.sleep(wait_sec)
            else:
                raise

# We can batch products into groups of 15 for Gemini coordination
batch_size = 15
spec_filenames = [s['file'] for s in specs]

# Pre-map specs by filename for rapid retrieval
spec_by_file = {s['file']: s for s in specs}

verified_matches = []

for i in range(0, len(products), batch_size):
    batch = products[i:i+batch_size]
    print(f"\n🤖 Processing batch {i//batch_size + 1} ({len(batch)} products) with Google AI Studio...")

    items_to_match = []
    for p in batch:
        ad = p.get('ad') or {}
        items_to_match.append({
            "id": p["id"],
            "slug": p.get("slug", ""),
            "name_en": ad.get("en", ""),
            "name_tr": ad.get("tr", ""),
            "name_de": ad.get("de", ""),
            "stok_kodu": p.get("stok_kodu", "")
        })

    prompt = f"""
You are an expert food product data coordinator. Match each product to the exact matching specification file from the manufacturer FO (Özmer Pastacılık).

Available Spec Files:
{json.dumps(spec_filenames, ensure_ascii=False, indent=1)}

Products to match:
{json.dumps(items_to_match, ensure_ascii=False, indent=2)}

Task:
For each product, find the BEST matching spec file from the available spec files list.
Rules:
1. Pay close attention to product type:
   - "sauce" vs "syrup" vs "powder" vs "fruited sauce/puree" vs "decor sauce" vs "beverage base"
   - "sugar free" should match "SUGAR FREE" specs.
   - "premium" should match "-PREMIUM" specs if available.
   - Specific flavors (e.g. Lime, Blackberry, Strawberry, Vanilla, Caramel, Hazelnut, White Chocolate).
2. If a product clearly matches a spec file, return matched_file with the exact filename.
3. If no spec exists for this product (e.g. a non-FO item or no spec available), set matched_file to null.

Return JSON in this exact structure:
{{
  "matches": [
    {{
      "id": "uuid",
      "slug": "product-slug",
      "matched_file": "exact filename or null",
      "confidence": "high" | "medium" | "low",
      "reason": "short explanation"
    }}
  ]
}}
"""
    ai_response = call_gemini(prompt)
    matches = ai_response.get("matches", [])
    
    for m in matches:
        pid = m["id"]
        matched_file = m.get("matched_file")
        matched_spec = spec_by_file.get(matched_file) if matched_file else None
        
        if matched_spec:
            min_t = matched_spec["min_temp"]
            max_t = matched_spec["max_temp"]
            shelf_m = matched_spec["shelf_months"]
        else:
            min_t = None
            max_t = None
            shelf_m = None

        verified_matches.append({
            "id": pid,
            "slug": m.get("slug"),
            "matched_file": matched_file,
            "min_temp": min_t,
            "max_temp": max_t,
            "shelf_months": shelf_m,
            "confidence": m.get("confidence"),
            "reason": m.get("reason")
        })
        print(f"  ✓ {m.get('slug')} -> {matched_file} (Temp: {min_t}-{max_t}°C, Shelf: {shelf_m}m)")

with open('scratch/gemini_verified_matches.json', 'w', encoding='utf-8') as f:
    json.dump(verified_matches, f, ensure_ascii=False, indent=2)

print(f"\n✅ All {len(verified_matches)} products coordinated with Google AI Studio and saved to scratch/gemini_verified_matches.json")
