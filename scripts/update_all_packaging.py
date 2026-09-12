import sys
import json
import os
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

# Read env
env = {}
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"\'')

supabase = create_client(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

# Load audited items
with open('scripts/packaging_audit_results.json', 'r', encoding='utf-8') as f:
    audit_items = json.load(f)

# Fetch current products with teknik_ozellikler to merge
res = supabase.table('urunler').select('id, stok_kodu, teknik_ozellikler').execute()
current_map = {p['id']: p for p in res.data}

updated_count = 0
errors = []

for item in audit_items:
    p_id = item['id']
    stok_kodu = item['stok_kodu']
    expected_koli = item['expected_koli']
    expected_palet = item['expected_palet_koli']
    
    current_row = current_map.get(p_id)
    teknik = current_row.get('teknik_ozellikler') or {} if current_row else {}
    teknik['koli_ici_adet'] = expected_koli
    teknik['palet_ici_koli'] = expected_palet

    payload = {
        "koli_ici_adet": expected_koli,
        "palet_ici_adet": expected_palet,
        "teknik_ozellikler": teknik
    }

    try:
        supabase.table('urunler').update(payload).eq('id', p_id).execute()
        updated_count += 1
    except Exception as e:
        errors.append((stok_kodu, str(e)))

print(f"Successfully updated packaging for {updated_count} / {len(audit_items)} products.")
if errors:
    print(f"Encountered {len(errors)} errors:")
    for err in errors:
        print(f"  {err[0]}: {err[1]}")
