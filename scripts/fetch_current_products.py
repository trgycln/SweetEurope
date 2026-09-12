import sys
import json
import os
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

env = {}
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"\'')

supabase = create_client(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

# Fetch all products
res = supabase.table('urunler').select('id, ad, stok_kodu, ean_gtin, koli_ici_adet, palet_ici_adet, teknik_ozellikler').order('stok_kodu').execute()

products = res.data
print(f"Total products fetched: {len(products)}")

with open("scripts/current_supabase_products.json", "w", encoding="utf-8") as f:
    json.dump(products, f, ensure_ascii=False, indent=2)

print("Saved current products to scripts/current_supabase_products.json")
