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

# Inspect single row keys in urunler
res = supabase.table('urunler').select('*').limit(1).execute()
if res.data:
    row = res.data[0]
    print("Columns in urunler:")
    for k in sorted(row.keys()):
        if any(w in k.lower() for w in ['palet', 'koli', 'adet', 'agirlik', 'hacim', 'birim', 'moq']):
            print(f"  {k}: {row[k]}")
