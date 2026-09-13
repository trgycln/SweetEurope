import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/all_db_products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

with open('scratch/all_parsed_specs.json', 'r', encoding='utf-8') as f:
    specs = json.load(f)

def normalize(s):
    s = s.lower()
    s = re.sub(r'[\(\)\.,\-_/]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

# Build index of specs
# Extract keywords from filename and spec_name
def get_keywords(text):
    words = normalize(text).split()
    # Filter stopwords
    stop = {'fo', 'food', 'products', 'product', 'syrup', 'sauce', 'flavored', 'flavour', 'flavoured', 'doc', 'docx', 'kg', 'gr', 'g', 'ml', 'cl', 'bottle', 'sugar', 'base', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '13', '14', '15', '16', '17', '18', '27', '37', '42', '71', '73', '74', '78', '82', '83', '90', '120', '121', '123', '125', '128', '129', '131'}
    return set(w for w in words if w not in stop and len(w) > 2)

spec_entries = []
for s in specs:
    fn_kw = get_keywords(s['file'])
    sn_kw = get_keywords(s['spec_name'])
    spec_entries.append({
        'spec': s,
        'keywords': fn_kw | sn_kw,
        'full_text': normalize(s['file'] + ' ' + s['spec_name'])
    })

matched = 0
unmatched = []
results = []

for p in products:
    ad_dict = p.get('ad') or {}
    ad_en = ad_dict.get('en', '')
    ad_tr = ad_dict.get('tr', '')
    ad_de = ad_dict.get('de', '')
    slug = p.get('slug', '')
    
    prod_kw = get_keywords(ad_en) | get_keywords(slug)
    
    best_spec = None
    best_score = 0

    for se in spec_entries:
        common = prod_kw & se['keywords']
        score = len(common)
        
        # Check specific product types: e.g. "puree", "fruited sauce", "premium", "decor"
        # boost if matching sauce vs syrup
        if 'sauce' in normalize(ad_en) and 'sauce' in se['full_text']:
            score += 1
        if 'syrup' in normalize(ad_en) and 'syrup' in se['full_text']:
            score += 1
        if 'powder' in normalize(ad_en) and 'powder' in se['full_text']:
            score += 2
        if 'sugar free' in normalize(ad_en) and ('sugar free' in se['full_text'] or 'free' in se['full_text']):
            score += 3

        if score > best_score:
            best_score = score
            best_spec = se['spec']

    if best_spec and best_score >= 2:
        matched += 1
        results.append({
            'product_id': p['id'],
            'product_name': ad_en or ad_tr,
            'slug': slug,
            'score': best_score,
            'matched_spec': best_spec['file'],
            'min_temp': best_spec['min_temp'],
            'max_temp': best_spec['max_temp'],
            'shelf_months': best_spec['shelf_months']
        })
    else:
        unmatched.append({
            'product_id': p['id'],
            'product_name': ad_en or ad_tr,
            'slug': slug,
            'prod_kw': list(prod_kw),
            'best_candidate': best_spec['file'] if best_spec else None,
            'best_score': best_score
        })

print(f"Total Products: {len(products)}")
print(f"Matched: {matched}")
print(f"Unmatched: {len(unmatched)}")

if unmatched:
    print("\n--- UNMATCHED SAMPLES ---")
    for u in unmatched:
        print(f"  ID: {u['product_id']} | Name: {u['product_name']} | Slug: {u['slug']} (Best: {u['best_candidate']} score {u['best_score']})")

with open('scratch/matching_results.json', 'w', encoding='utf-8') as f:
    json.dump({'matched': results, 'unmatched': unmatched}, f, ensure_ascii=False, indent=2)
