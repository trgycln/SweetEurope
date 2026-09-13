import os
import glob
import re
import fitz  # PyMuPDF
import docx
import olefile
import struct
import json
import sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')
from scratch.analyze_temp_and_shelf_life import extract_doc_raw, extract_pdf_raw

spec_files = glob.glob("dokuments/FO Ürün Spektleri/**/*.doc*", recursive=True)
label_files = glob.glob("dokuments/Ürün Etiketleri/**/*.pdf", recursive=True)

print(f"Spec files: {len(spec_files)}, Label files: {len(label_files)}")

# 1. ANALYZE ALL SPECS
spec_storage_texts = Counter()
spec_shelf_texts = Counter()
spec_temperatures = Counter()
spec_after_opening_found = []

for sf in spec_files:
    fname = os.path.basename(sf)
    raw = extract_doc_raw(sf)
    
    # Extract Storing Conditions line
    m_store = re.search(r'Stor(?:ing|age)\s*Conditions?\s*:\s*([^\n\r|\x07]+)', raw, re.IGNORECASE)
    if m_store:
        st_text = re.sub(r'\s+', ' ', m_store.group(1)).strip()
        spec_storage_texts[st_text] += 1
    else:
        # Check if there is another storage mention
        m_alt = re.search(r'(?:It should be stored[^\n\r|\x07]+)', raw, re.IGNORECASE)
        if m_alt:
            spec_storage_texts[re.sub(r'\s+', ' ', m_alt.group(0)).strip()] += 1

    # Extract Shelf life line
    m_shelf = re.search(r'Shelf\s*life\s*:\s*([^\n\r|\x07]+)', raw, re.IGNORECASE)
    if m_shelf:
        sh_text = re.sub(r'\s+', ' ', m_shelf.group(1)).strip()
        spec_shelf_texts[sh_text] += 1

    # Extract Temperatures: matches like 20-22, 18-22, 15-25, etc.
    temps = re.findall(r'(\d+\s*[-–]\s*\d+\s*[º°o]?\s*C|\d+\s*[º°o]\s*C)', raw, re.IGNORECASE)
    for t in temps:
        t_clean = re.sub(r'\s+', ' ', t).strip()
        spec_temperatures[t_clean] += 1

    # Search for anything related to opening / after opening / days / consume
    # Keywords: open, after, tag, day, verbrauch, buzdolabı, refrig, açıl, tüket
    after_matches = re.findall(r'([^\.\n\r|\x07]{0,60}(?:after\s+opening|opened|açıldık|nach\s+(?:dem\s+)?öffnen|geöffnet|consume\s+within|refrigerat|buzdolab)[^\.\n\r|\x07]{0,60})', raw, re.IGNORECASE)
    if after_matches:
        for am in after_matches:
            # Filter out "unopened"
            if 'unopened' in am.lower() and 'after' not in am.lower():
                continue
            spec_after_opening_found.append({"file": fname, "text": am.strip()})

# 2. ANALYZE ALL LABELS
label_storage_texts = Counter()
label_shelf_texts = Counter()
label_temperatures = Counter()
label_after_opening_found = []

for lf in label_files:
    fname = os.path.basename(lf)
    raw = extract_pdf_raw(lf)

    # Search storage text in label
    m_store = re.findall(r'([^\.\n\r]{0,40}(?:saklayınız|muhafaza|aufbewahren|lagern|store)[^\.\n\r]{0,60})', raw, re.IGNORECASE)
    for s in m_store:
        label_storage_texts[re.sub(r'\s+', ' ', s).strip()] += 1

    # Search temperatures
    temps = re.findall(r'(\d+\s*[-–]\s*\d+\s*[º°o]?\s*C|\d+\s*[º°o]\s*C)', raw, re.IGNORECASE)
    for t in temps:
        t_clean = re.sub(r'\s+', ' ', t).strip()
        label_temperatures[t_clean] += 1

    # Search after opening in labels
    after_matches = re.findall(r'([^\.\n\r]{0,60}(?:after\s+opening|opened|açıldık|nach\s+(?:dem\s+)?öffnen|geöffnet|consume\s+within|refrigerat|buzdolab|gün\s+içinde|tage|tüketiniz)[^\.\n\r]{0,60})', raw, re.IGNORECASE)
    for am in after_matches:
        if 'tavsiye edilen' in am.lower() or 'tett' in am.lower() or 'unopened' in am.lower():
            # Check if it actually mentions after opening
            if not any(k in am.lower() for k in ['açıldık', 'opening', 'opened', 'öffn', 'gün içinde', 'tüketiniz', 'buzdolab']):
                continue
        label_after_opening_found.append({"file": fname, "text": am.strip()})

out_data = {
    "spec_summary": {
        "total_files": len(spec_files),
        "temperatures_found": dict(spec_temperatures),
        "storage_condition_sentences": dict(spec_storage_texts),
        "shelf_life_sentences": dict(spec_shelf_texts),
        "after_opening_occurrences": spec_after_opening_found
    },
    "label_summary": {
        "total_files": len(label_files),
        "temperatures_found": dict(label_temperatures),
        "storage_condition_sentences": dict(label_storage_texts),
        "after_opening_occurrences": label_after_opening_found
    }
}

with open("scratch/deep_analysis_result.json", "w", encoding="utf-8") as f:
    json.dump(out_data, f, ensure_ascii=False, indent=2)

print("=== SPECS TEMPERATURES ===")
for k, v in spec_temperatures.most_common(10):
    print(f"  {k}: {v} times")

print("\n=== SPECS STORAGE TEXTS ===")
for k, v in spec_storage_texts.most_common(5):
    print(f"  ({v} files): {k}")

print("\n=== SPECS SHELF LIFE ===")
for k, v in spec_shelf_texts.most_common(5):
    print(f"  ({v} files): {k}")

print(f"\n=== SPECS AFTER OPENING MATCHES ({len(spec_after_opening_found)}) ===")
for item in spec_after_opening_found[:10]:
    print(f"  {item['file']}: {item['text']}")

print("\n" + "="*50)
print("=== LABELS TEMPERATURES ===")
for k, v in label_temperatures.most_common(10):
    print(f"  {k}: {v} times")

print("\n=== LABELS STORAGE TEXTS ===")
for k, v in label_storage_texts.most_common(10):
    print(f"  ({v} files): {k}")

print(f"\n=== LABELS AFTER OPENING MATCHES ({len(label_after_opening_found)}) ===")
for item in label_after_opening_found[:10]:
    print(f"  {item['file']}: {item['text']}")
