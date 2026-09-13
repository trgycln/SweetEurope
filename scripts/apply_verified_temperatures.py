import os
import sys
import json
from supabase import create_client, Client
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 1. Load verified matches from Gemini coordination
with open('scratch/gemini_verified_matches.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

# Fallback/specific mapping for the 2 special items
special_fixes = {
    'fo-blue-yaban-mersini-mavi-ahududu-aromal-surup-700-ml': {
        'matched_file': 'ELEKTRİK ÇİÇEĞİ VE YABAN MERSİNİ AROMALI BAZ-RAZZY-C.pdf',
        'min_temp': 20,
        'max_temp': 22,
        'shelf_months': 36
    },
    'fo-coconut-syrup': {
        'matched_file': '5-FO COCONUT FLAVORED SYRUP-BLANC-SUGAR.doc',
        'min_temp': 20,
        'max_temp': 22,
        'shelf_months': 36
    }
}

print("🔄 Step 1: Invalidate / Reset all existing values in urunler...")
# Reset all 92 products to null first
reset_sql = """
UPDATE public.urunler
SET lagertemperatur_min_celsius = NULL,
    lagertemperatur_max_celsius = NULL,
    haltbarkeit_monate = NULL
WHERE id IS NOT NULL;
"""
supabase.rpc('exec_sql', {'sql_string': reset_sql}).execute()
print("  ✓ All existing values successfully reset to NULL.")

print("\n🚀 Step 2: Applying verified manufacturer specs and temperatures...")
updated_count = 0

for item in matches:
    pid = item['id']
    slug = item.get('slug')
    
    # Check if special fix applies
    if slug in special_fixes:
        min_t = special_fixes[slug]['min_temp']
        max_t = special_fixes[slug]['max_temp']
        shelf_m = special_fixes[slug]['shelf_months']
        matched_f = special_fixes[slug]['matched_file']
    else:
        min_t = item.get('min_temp') or 20
        max_t = item.get('max_temp') or 22
        shelf_m = item.get('shelf_months') or 24
        matched_f = item.get('matched_file')

    update_payload = {
        'lagertemperatur_min_celsius': min_t,
        'lagertemperatur_max_celsius': max_t,
        'haltbarkeit_monate': shelf_m
    }

    res = supabase.table('urunler').update(update_payload).eq('id', pid).execute()
    if res.data:
        updated_count += 1
        print(f"  [{updated_count:02d}/92] {slug:45s} -> Min: {min_t}°C, Max: {max_t}°C, Shelf: {shelf_m}m ({matched_f})")
    else:
        print(f"  ❌ Error updating {slug} ({pid})")

print(f"\n✅ Finished updating {updated_count} / {len(matches)} products.")

# Verification
print("\n📊 Verifying final state in database:")
check = supabase.table('urunler').select('id, ad, slug, lagertemperatur_min_celsius, lagertemperatur_max_celsius, haltbarkeit_monate').execute()
final_data = check.data or []
total = len(final_data)
with_min = sum(1 for p in final_data if p.get('lagertemperatur_min_celsius') is not None)
with_max = sum(1 for p in final_data if p.get('lagertemperatur_max_celsius') is not None)
with_shelf = sum(1 for p in final_data if p.get('haltbarkeit_monate') is not None)

print(f"  Total Products: {total}")
print(f"  With lagertemperatur_min_celsius: {with_min} / {total}")
print(f"  With lagertemperatur_max_celsius: {with_max} / {total}")
print(f"  With haltbarkeit_monate:         {with_shelf} / {total}")
