import os
import glob
import re
import json
import struct
import sys
import time
from deep_translator import GoogleTranslator
from supabase import create_client, Client
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials in .env.local")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Translation dictionary cache
translation_cache = {}

def translate_to(text, target_lang):
    if not text or not text.strip():
        return ""
    cache_key = f"{target_lang}:{text.strip()}"
    if cache_key in translation_cache:
        return translation_cache[cache_key]
    try:
        translated = GoogleTranslator(source='en', target=target_lang).translate(text)
        translation_cache[cache_key] = translated
        time.sleep(0.05)
        return translated
    except Exception as e:
        print(f"Translation error ({target_lang}): {e}")
        return text

# Load parsed specs
with open('parsed_all_specs.json', 'r', encoding='utf-8') as f:
    specs = json.load(f)

# Load label files
with open('src/lib/label-files.json', 'r', encoding='utf-8') as f:
    labels = json.load(f)

# Fetch all products from DB
res = supabase.from_('urunler').select('id, ad, slug, stok_kodu, ean_gtin, aktif, inhaltsstoffe, naehrwerte, allergene, produktdatenblatt_url').execute()
db_products = res.data

print(f"Loaded {len(db_products)} products from database.")
print(f"Loaded {len(specs)} spec sheets.")
print(f"Loaded {len(labels)} label PDFs.")

FLAVOR_MAP = {
    "strawberry": ["çilek", "erdbeer", "strawberry", "cilek"],
    "caramel": ["karamel", "caramel", "toffee"],
    "vanilla": ["vanilya", "vanille", "vanilla"],
    "hazelnut": ["fındık", "haselnuss", "hazelnut", "findik"],
    "chocolate": ["çikolata", "schokolade", "chocolate", "cikolata"],
    "dark chocolate": ["bitter çikolata", "dunkle schokolade", "dark chocolate", "bitter cikolata", "bitter"],
    "white chocolate": ["beyaz çikolata", "weiße schokolade", "white chocolate", "weisse schokolade", "blanc"],
    "banana": ["muz", "banane", "banana"],
    "kiwi": ["kivi", "kiwi"],
    "coconut": ["hindistan cevizi", "kokos", "coconut"],
    "mango": ["mango"],
    "peach": ["şeftali", "pfirsich", "peach", "seftali"],
    "raspberry": ["frambuaz", "ahududu", "himbeer", "raspberry"],
    "blackberry": ["böğürtlen", "brombeer", "blackberry", "bogurtlen"],
    "black mulberry": ["karadut", "schwarze maulbeere", "black mulberry", "black mullberry"],
    "wild berries": ["orman meyve", "waldbeere", "wild berries", "forest fruit"],
    "blueberry": ["yaban mersini", "blaubeere", "heidelbeere", "blueberry"],
    "green apple": ["yeşil elma", "grüner apfel", "green apple", "yesil elma"],
    "watermelon": ["karpuz", "wassermelone", "watermelon"],
    "melon": ["kavun", "melone", "melon"],
    "lemon": ["limon", "zitrone", "lemon", "lime"],
    "passion fruit": ["çarkıfelek", "passionsfrucht", "passion fruit", "maracuja"],
    "pineapple": ["ananas", "pineapple"],
    "mint": ["nane", "minze", "peppermint", "spearmint", "mint", "bahçenane"],
    "pomegranate": ["nar", "granatapfel", "pomegranate", "grenadine"],
    "hibiscus": ["hibiskus", "hibiscus"],
    "chai tea": ["chai tea", "chai"],
    "matcha": ["matcha", "yeşil çay", "grüntee"],
    "taro": ["taro"],
    "pistachio": ["antep fıstık", "pistazie", "pistachio"],
    "popping candy": ["patlayan şeker", "knisterzucker", "popping candy"],
    "sorrel": ["madame sorrel", "kuzukulak", "sauerampfer", "sorrel"],
    "apollo": ["apollo"],
    "zeus": ["zeus"],
    "helios": ["helios"],
    "dionysos": ["dionysos"],
    "herakles": ["herakles"],
    "mojito": ["mojito"],
    "blue curacao": ["blue curacao", "mavi turunç"],
    "blue raspberry": ["blue raspberry", "mavi frambuaz"],
    "cool lime": ["cool lime", "misket limon"],
    "sakura": ["sakura", "beyaz şeftali", "kirschblüte"],
    "cocktail foamer": ["köpürtücü", "foamer", "kopurtucu", "koi"],
    "quattro base": ["quattro", "base", "baz", "ouattro"]
}

def get_product_type(name_str):
    name_str = name_str.lower()
    if "decor" in name_str or "topping" in name_str or "dekor" in name_str:
        return "topping"
    if "barsos" in name_str or "bar sos" in name_str or "bar-sos" in name_str:
        return "barsos"
    if "fruited sauce" in name_str or "pure sos" in name_str or "püreesauce" in name_str or "frozen" in name_str:
        return "frozen"
    if "sauce" in name_str or "sos" in name_str:
        return "sauce"
    if "powder" in name_str or "toz" in name_str or "milkshake" in name_str or "latte" in name_str or "frappe" in name_str:
        return "toz"
    if "beverage" in name_str or "içecek" in name_str or "icecek" in name_str or "getränk" in name_str:
        return "icecek"
    return "surup"

def match_spec_to_product(spec, products):
    spec_file = spec['file'].lower()
    spec_pname = spec['product_name'].lower()
    spec_type = get_product_type(spec_file + " " + spec_pname)
    
    detected_flavors = []
    for flavor_key, synonyms in FLAVOR_MAP.items():
        for syn in synonyms:
            if syn in spec_file or syn in spec_pname:
                detected_flavors.append(flavor_key)
                break
                
    is_sugar_free = "sugar free" in spec_file or "sugar free" in spec_pname or "şekersiz" in spec_file or "sekersiz" in spec_file or "zuckerfrei" in spec_file
    is_premium = "premium" in spec_file or "premium" in spec_pname
    
    candidates = []
    for p in products:
        p_de = (p.get('ad', {}).get('de') or '').lower()
        p_tr = (p.get('ad', {}).get('tr') or '').lower()
        p_en = (p.get('ad', {}).get('en') or '').lower()
        p_slug = (p.get('slug') or '').lower()
        p_all = f"{p_de} {p_tr} {p_en} {p_slug}"
        
        p_type = get_product_type(p_all)
        if spec_type != p_type:
            if not ((spec_type in ['sauce', 'barsos', 'frozen']) and (p_type in ['sauce', 'barsos', 'frozen'])):
                continue
                
        p_sugar_free = "şekersiz" in p_all or "sekersiz" in p_all or "zuckerfrei" in p_all or "sugar free" in p_all
        if is_sugar_free != p_sugar_free:
            continue
            
        p_premium = "premium" in p_all
        
        match_score = 0
        for f in detected_flavors:
            for syn in FLAVOR_MAP[f]:
                if syn in p_all:
                    match_score += 10
                    break
                    
        if match_score > 0:
            if is_premium == p_premium:
                match_score += 5
            if p.get('aktif'):
                match_score += 3
            candidates.append((match_score, p))
            
    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]
    return None

def find_label_url_for_product(p, labels):
    p_de = (p.get('ad', {}).get('de') or '').lower()
    p_tr = (p.get('ad', {}).get('tr') or '').lower()
    p_en = (p.get('ad', {}).get('en') or '').lower()
    p_slug = (p.get('slug') or '').lower()
    p_all = f"{p_de} {p_tr} {p_en} {p_slug}"
    
    best_label = None
    best_score = 0
    
    for l in labels:
        score = 0
        l_name = l['originalName'].lower()
        l_raw = l.get('rawPath', '').lower()
        l_all = f"{l_name} {l_raw}"
        
        p_type = get_product_type(p_all)
        l_type = get_product_type(l_all)
        if p_type == l_type:
            score += 5
            
        for f_key, synonyms in FLAVOR_MAP.items():
            for syn in synonyms:
                if syn in p_all and (syn in l_name or syn in l_raw):
                    score += 10
                    break
                    
        if "premium" in p_all and "premium" in l_all:
            score += 5
        if ("şekersiz" in p_all or "zuckerfrei" in p_all or "sugar free" in p_all) and ("sekersiz" in l_all or "seker-siz" in l_all):
            score += 8
            
        if score > best_score and score >= 15:
            best_score = score
            best_label = l['publicUrl']
            
    return best_label

def format_ingredients(ing_en):
    if not ing_en:
        return {}
    
    de = translate_to(ing_en, 'de')
    tr = translate_to(ing_en, 'tr')
    ar = translate_to(ing_en, 'ar')
    
    # Polish formatting
    return {
        'de': de,
        'tr': tr,
        'en': ing_en,
        'ar': ar
    }

print("\n🚀 Starting batch update for all products...")

updated_count = 0
error_count = 0

for idx, spec in enumerate(specs):
    matched_p = match_spec_to_product(spec, db_products)
    if not matched_p:
        print(f"⚠️ [{idx+1}/{len(specs)}] No DB product match for spec: {spec['file']}")
        continue
        
    p_id = matched_p['id']
    p_name = matched_p['ad'].get('de') or matched_p['ad'].get('tr')
    
    # 1. Ingredients
    inhaltsstoffe = format_ingredients(spec.get('ingredients_text_en', ''))
    
    # 2. Nutrition
    naehrwerte = spec.get('nutrition')
    
    # 3. Allergens
    allergene = spec.get('allergens')
    
    # 4. Label PDF URL
    label_pdf_url = find_label_url_for_product(matched_p, labels) or matched_p.get('produktdatenblatt_url')
    
    update_payload = {}
    if inhaltsstoffe and len(inhaltsstoffe) > 0:
        update_payload['inhaltsstoffe'] = inhaltsstoffe
    if naehrwerte and len(naehrwerte) > 0:
        update_payload['naehrwerte'] = naehrwerte
        update_payload['besin_degerleri'] = naehrwerte
    if allergene and len(allergene) > 0:
        update_payload['allergene'] = allergene
    if label_pdf_url:
        update_payload['produktdatenblatt_url'] = label_pdf_url
    if spec.get('storage_min') is not None:
        update_payload['lagertemperatur_min_celsius'] = spec['storage_min']
    if spec.get('storage_max') is not None:
        update_payload['lagertemperatur_max_celsius'] = spec['storage_max']
    if spec.get('shelf_life_months') is not None:
        update_payload['haltbarkeit_monate'] = spec['shelf_life_months']

    if not update_payload:
        continue
        
    try:
        supabase.from_('urunler').update(update_payload).eq('id', p_id).execute()
        updated_count += 1
        print(f"✅ [{updated_count}] Updated: {p_name} ({matched_p['slug']}) | Nut: {'✅' if naehrwerte else '—'} | Ing: {'✅' if inhaltsstoffe else '—'} | All: {'✅' if allergene else '—'} | PDF: {'✅' if label_pdf_url else '—'}")
    except Exception as e:
        print(f"❌ Error updating {p_name}: {e}")
        error_count += 1

print(f"\n==========================================")
print(f"🎉 Update completed! Successfully updated {updated_count} products ({error_count} errors).")
print(f"==========================================")
