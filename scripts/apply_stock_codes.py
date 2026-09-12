import os
import json
import requests
import time
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}

mapping_file = 'data/stock_code_mapping_review.json'
with open(mapping_file, 'r', encoding='utf-8') as f:
    items = json.load(f)

print(f'Starting stock code update for {len(items)} products...', flush=True)

success_count = 0
for i, item in enumerate(items, 1):
    slug = item['slug']
    new_code = item['proposed']
    
    # Retry loop
    updated = False
    for attempt in range(3):
        try:
            r = requests.get(f'{url}/rest/v1/urunler?slug=eq.{slug}', headers=headers, timeout=20).json()
            if not r:
                print(f'[{i}/{len(items)}] ⚠️ Product not found: {slug}', flush=True)
                updated = True
                break
                
            p = r[0]
            pid = p['id']
            if p.get('stok_kodu') == new_code:
                print(f'[{i}/{len(items)}] ⏩ Already set: {new_code} for {slug}', flush=True)
                success_count += 1
                updated = True
                break
                
            patch_res = requests.patch(f'{url}/rest/v1/urunler?id=eq.{pid}', headers=headers, json={'stok_kodu': new_code}, timeout=20)
            if patch_res.status_code in [200, 204]:
                success_count += 1
                print(f'[{i}/{len(items)}] ✅ {new_code}: {slug}', flush=True)
                updated = True
                break
            else:
                print(f'[{i}/{len(items)}] ❌ Patch failed for {slug}: {patch_res.status_code} - {patch_res.text[:100]}', flush=True)
                time.sleep(1)
        except Exception as e:
            print(f'[{i}/{len(items)}] ⚠️ Attempt {attempt+1} error: {e}', flush=True)
            time.sleep(2)
            
    time.sleep(0.1)

print(f'\n🎉 Completed! Successfully verified/updated {success_count} of {len(items)} products in Supabase.', flush=True)
