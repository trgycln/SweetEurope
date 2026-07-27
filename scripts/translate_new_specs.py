import json
import sys
from deep_translator import GoogleTranslator

sys.stdout.reconfigure(encoding='utf-8')

def translate_text(text, target_lang):
    if not text: return ""
    try:
        return GoogleTranslator(source='auto', target=target_lang).translate(text)
    except Exception as e:
        print(f"Translation error: {e}")
        return text

def main():
    with open('new_specs_en.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Loaded {len(data)} items to translate.")
    
    for i, item in enumerate(data):
        print(f"Translating item {i+1}/{len(data)}: {item.get('orjinal_ad')}")
        
        # Translate name
        en_name = item['ad']['en']
        if en_name:
            item['ad']['de'] = translate_text(en_name, 'de')
            item['ad']['tr'] = translate_text(en_name, 'tr')
            item['ad']['ar'] = translate_text(en_name, 'ar')
            
        # Translate description
        en_desc = item['aciklama']['en']
        if en_desc:
            item['aciklama']['de'] = translate_text(en_desc, 'de')
            item['aciklama']['tr'] = translate_text(en_desc, 'tr')
            item['aciklama']['ar'] = translate_text(en_desc, 'ar')
            
        # Translate ingredients
        en_ing = item['inhaltsstoffe']['en']
        if en_ing:
            item['inhaltsstoffe']['de'] = translate_text(en_ing, 'de')
            item['inhaltsstoffe']['tr'] = translate_text(en_ing, 'tr')
            item['inhaltsstoffe']['ar'] = translate_text(en_ing, 'ar')
            
    with open('extracted_new_specs.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Saved translated to extracted_new_specs.json")

if __name__ == "__main__":
    main()
