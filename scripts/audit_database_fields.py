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
res = supabase.table('urunler').select('*').execute()
all_prods = res.data

col_stats = {}
teknik_stats = {}

for p in all_prods:
    for k, v in p.items():
        if v is not None and v != '' and v != [] and v != {}:
            col_stats[k] = col_stats.get(k, 0) + 1
    tek = p.get('teknik_ozellikler')
    if isinstance(tek, dict):
        for tk, tv in tek.items():
            if tv is not None and tv != '' and tv != [] and tv != {}:
                teknik_stats[tk] = teknik_stats.get(tk, 0) + 1

print('=== 92 ÜRÜNDE DEĞERİ DOLU OLAN SÜTUNLAR (DOLULUK SAYISI) ===')
for k, count in sorted(col_stats.items(), key=lambda x: -x[1]):
    print(f'  {k}: {count} / {len(all_prods)}')

print('\n=== TEKNİK ÖZELLİKLER İÇİNDE DOLU OLAN ALANLAR ===')
for k, count in sorted(teknik_stats.items(), key=lambda x: -x[1]):
    print(f'  {k}: {count} / {len(all_prods)}')
