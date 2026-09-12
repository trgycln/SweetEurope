import sys
import json
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

# Fetch sample products to see all non-null fields
res = supabase.table('urunler').select('*').limit(10).execute()
rows = res.data

if not rows:
    print("No products found")
    sys.exit(0)

# Collect all columns across the sample
all_columns = set()
for r in rows:
    all_columns.update(r.keys())

print("=== URÜNLER TABLOSUNDAKİ TÜM SÜTUNLAR ===")
for col in sorted(all_columns):
    # Check if there are non-null values
    sample_val = next((r[col] for r in rows if r.get(col) is not None), None)
    val_type = type(sample_val).__name__ if sample_val is not None else "None"
    sample_preview = str(sample_val)[:50] if sample_val is not None else "Hepsi NULL"
    print(f"• {col} ({val_type}): {sample_preview}")

# Check all keys inside teknik_ozellikler
teknik_keys = set()
for r in rows:
    tek = r.get('teknik_ozellikler')
    if isinstance(tek, dict):
        teknik_keys.update(tek.keys())

print("\n=== TEKNİK_ÖZELLİKLER İÇİNDEKİ TÜM ALANLAR ===")
for k in sorted(teknik_keys):
    sample_val = next((r['teknik_ozellikler'][k] for r in rows if isinstance(r.get('teknik_ozellikler'), dict) and r['teknik_ozellikler'].get(k) is not None), None)
    print(f"• {k}: {str(sample_val)[:60]}")
