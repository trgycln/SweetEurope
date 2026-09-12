import sys
import json
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/packaging_audit_results.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

by_cat = defaultdict(list)
for it in items:
    by_cat[it['category_group']].append(it)

print("=== 92 ÜRÜNÜN AMBALAJ & PALET STANDARTLARI ÖZETİ ===\n")

for cat, prod_list in sorted(by_cat.items()):
    sample = prod_list[0]
    print(f"📦 {cat} ({len(prod_list)} Ürün):")
    print(f"   • Standart Koli İçi Adet: {sample['expected_koli']} adet")
    print(f"   • Standart Palet İçi Koli: {sample['expected_palet_koli']} koli")
    print(f"   • 1 Palette Toplam Adet: {sample['expected_koli'] * sample['expected_palet_koli']} adet")
    
    # Check any weird discrepancies
    koli_issues = [p for p in prod_list if not p['koli_match']]
    if koli_issues:
        print(f"   ⚠️ Koli İçi Düzeltilecekler: {[p['stok_kodu'] for p in koli_issues]}")
    else:
        print("   ✓ Koli İçi Adetler veritabanında doğru (veya Beyaz Çikolatalı Dondurma Sosu null idi).")
    
    cur_palet_samples = set(p['cur_palet'] for p in prod_list if p['cur_palet'] is not None)
    print(f"   ❌ Şu anki hatalı sipariş adetleri: {sorted(list(cur_palet_samples))[:6]}")
    print()
