import os

langs = ['en', 'tr', 'ar']
for lang in langs:
    for ext in ['ts', 'json']:
        path = f'src/dictionaries/{lang}.{ext}'
        if os.path.exists(path):
            with open(path, encoding='utf-8') as f:
                content = f.read()
            has_seo = 'seo:' in content or '"seo"' in content
            print(f'{path}: SEO={has_seo}')