import json
import os
import re
import sys
from supabase import create_client, Client
from dotenv import load_dotenv
from deep_translator import GoogleTranslator

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load parsed specs
with open('parsed_all_specs.json', 'r', encoding='utf-8') as f:
    specs = json.load(f)

# Load label files
with open('src/lib/label-files.json', 'r', encoding='utf-8') as f:
    labels = json.load(f)

# Fetch all products from DB
res = supabase.from_('urunler').select('id, ad, slug, stok_kodu, ean_gtin, aktif, inhaltsstoffe, naehrwerte, allergene, produktdatenblatt_url').execute()
db_products = res.data

print(f"Total DB Products: {len(db_products)}")
print(f"Total Specs: {len(specs)}")
print(f"Total Labels: {len(labels)}")

# Translation cache to avoid repeated API calls
translation_cache = {}

def translate_text(text, target_lang):
    if not text or not text.strip():
        return ""
    cache_key = f"{target_lang}:{text}"
    if cache_key in translation_cache:
        return translation_cache[cache_key]
    try:
        translated = GoogleTranslator(source='auto', target=target_lang).translate(text)
        translation_cache[cache_key] = translated
        return translated
    except Exception as e:
        print(f"Translation error ({target_lang}): {e}")
        return text

# Flavor dictionary mapping
FLAVOR_MAP = {
    "strawberry": ["çilek", "erdbeer", "strawberry", "cilek"],
    "caramel": ["karamel", "caramel", "toffee"],
    "vanilla": ["vanilya", "vanille", "vanilla"],
    "hazelnut": ["fındık", "haselnuss", "hazelnut", "findik"],
    "chocolate": ["çikolata", "schokolade", "chocolate", "cikolata"],
    "dark chocolate": ["bitter çikolata", "dunkle schokolade", "dark chocolate", "bitter cikolata"],
    "white chocolate": ["beyaz çikolata", "weiße schokolade", "white chocolate", "weisse schokolade"],
    "banana": ["muz", "banane", "banana"],
    "kiwi": ["kivi", "kiwi"],
    "coconut": ["hindistan cevizi", "kokos", "coconut"],
    "mango": ["mango"],
    "peach": ["şeftali", "pfirsich", "peach", "seftali"],
    "raspberry": ["frambuaz", "ahududu", "himbeer", "raspberry"],
    "blackberry": ["böğürtlen", "brombeer", "blackberry", "bogurtlen"],
    "black mulberry": ["karadut", "schwarze maulbeere", "black mulberry", "black mullberry"],
    "blueberry": ["yaban mersini", "blaubeere", "heidelbeere", "blueberry"],
    "green apple": ["yeşil elma", "grüner apfel", "green apple", "yesil elma"],
    "watermelon": ["karpuz", "wassermelone", "watermelon"],
    "melon": ["kavun", "melone", "melon"],
    "lemon": ["limon", "zitrone", "lemon", "lime"],
    "passion fruit": ["çarkıfelek", "passionsfrucht", "passion fruit", "maracuja"],
    "pineapple": ["ananas", "pineapple"],
    "mint": ["nane", "minze", "peppermint", "spearmint", "mint"],
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
    "sakura": ["sakura", "beyaz şeftali", "kirschblüte"]
}

def get_product_type(name_str):
    name_str = name_str.lower()
    if "decor" in name_str or "topping" in name_str or "dekor" in name_str:
        return "topping"
    if "sauce" in name_str or "sos" in name_str:
        if "bar" in name_str:
            return "barsos"
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
    
    # Identify flavor keywords in spec
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
            # Allow barsos / sauce slight cross
            if not ((spec_type in ['sauce', 'barsos']) and (p_type in ['sauce', 'barsos'])):
                continue
                
        p_sugar_free = "şekersiz" in p_all or "sekersiz" in p_all or "zuckerfrei" in p_all or "sugar free" in p_all
        if is_sugar_free != p_sugar_free:
            continue
            
        p_premium = "premium" in p_all
        if is_premium != p_premium and not is_sugar_free:
            # Prefer premium to premium
            pass
            
        # Match flavors
        match_score = 0
        for f in detected_flavors:
            for syn in FLAVOR_MAP[f]:
                if syn in p_all:
                    match_score += 10
                    break
                    
        if match_score > 0:
            if is_premium == p_premium:
                match_score += 5
            candidates.append((match_score, p))
            
    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]
    return None

matches = []
unmatched = []

for spec in specs:
    p = match_spec_to_product(spec, db_products)
    if p:
        matches.append((spec, p))
    else:
        unmatched.append(spec)

print(f"\n✅ Matched {len(matches)} / {len(specs)} specs to DB products.")
if unmatched:
    print(f"\n❌ Unmatched specs ({len(unmatched)}):")
    for u in unmatched:
        print(f"  - File: {u['file']} | Name: {u['product_name']}")

# Match PDF labels to matched products
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
        
        # Check type
        p_type = get_product_type(p_all)
        l_type = get_product_type(l_raw + " " + l_name)
        if p_type == l_type:
            score += 5
            
        for f_key, synonyms in FLAVOR_MAP.items():
            for syn in synonyms:
                if syn in p_all and (syn in l_name or syn in l_raw):
                    score += 10
                    break
                    
        if "premium" in p_all and "premium" in l_name:
            score += 5
        if ("şekersiz" in p_all or "zuckerfrei" in p_all or "sugar free" in p_all) and ("sekersiz" in l_name or "seker-siz" in l_name):
            score += 8
            
        if score > best_score and score >= 15:
            best_score = score
            best_label = l['publicUrl']
            
    return best_label

# Show strawberry match sample
print("\n--- SAMPLE STRAWBERRY PRODUCT CHECK ---")
for spec, p in matches:
    if "strawberry" in spec['product_name'].lower() or "cilek" in spec['file'].lower() or "çilek" in spec['file'].lower():
        p_name = p['ad'].get('de') or p['ad'].get('tr')
        lbl_url = find_label_url_for_product(p, labels)
        print(f"Spec: {spec['file']} -> Product: {p_name} ({p['slug']})")
        print(f"  Nutrition: {spec.get('nutrition')}")
        print(f"  Label URL: {lbl_url}")
