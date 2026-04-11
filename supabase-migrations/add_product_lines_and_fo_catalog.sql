-- Migration: Add product-line structure and FO catalog starter setup
-- Date: 2026-04-07
-- Description: Introduces two complementary product lines and seeds FO-oriented categories/templates.

begin;

alter table public.kategoriler
add column if not exists urun_gami text;

alter table public.urunler
add column if not exists urun_gami text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'kategoriler_urun_gami_check'
  ) then
    alter table public.kategoriler
      add constraint kategoriler_urun_gami_check
      check (urun_gami is null or urun_gami in ('frozen-desserts', 'barista-bakery-essentials'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'urunler_urun_gami_check'
  ) then
    alter table public.urunler
      add constraint urunler_urun_gami_check
      check (urun_gami is null or urun_gami in ('frozen-desserts', 'barista-bakery-essentials'));
  end if;
end $$;

update public.kategoriler
set urun_gami = 'frozen-desserts'
where slug in ('cakes-and-tarts', 'cookies-and-muffins', 'pizza-and-fast-food');

update public.kategoriler
set urun_gami = 'barista-bakery-essentials'
where slug in ('sauces-and-ingredients', 'coffee', 'drinks');

update public.kategoriler child
set urun_gami = parent.urun_gami
from public.kategoriler parent
where child.ust_kategori_id = parent.id
  and parent.urun_gami is not null
  and (child.urun_gami is null or child.urun_gami <> parent.urun_gami);

update public.urunler u
set urun_gami = k.urun_gami
from public.kategoriler k
where u.kategori_id = k.id
  and k.urun_gami is not null
  and (u.urun_gami is null or u.urun_gami <> k.urun_gami);

insert into public.tedarikciler (unvan, yetkili_kisi, email, telefon)
select 'FO', 'FO Product Line', null, null
where not exists (
  select 1 from public.tedarikciler where lower(unvan) = 'fo'
);

with parent_map as (
  select id, slug from public.kategoriler
  where slug in ('coffee', 'sauces-and-ingredients', 'drinks')
), new_categories as (
  select * from (
    values
      ('coffee', 'coffee-syrups', jsonb_build_object('de', 'Kaffeesirupe', 'en', 'Coffee Syrups', 'tr', 'Kahve Şurupları', 'ar', 'شراب القهوة')),
      ('sauces-and-ingredients', 'bakery-fillings', jsonb_build_object('de', 'Backfüllungen', 'en', 'Bakery Fillings', 'tr', 'Pastane İç Dolguları', 'ar', 'حشوات المخبوزات')),
      ('sauces-and-ingredients', 'specialty-sauces', jsonb_build_object('de', 'Spezialsaucen', 'en', 'Specialty Sauces', 'tr', 'Özel Soslar', 'ar', 'صلصات متخصصة')),
      ('drinks', 'drink-bases', jsonb_build_object('de', 'Getränkebasen', 'en', 'Drink Bases', 'tr', 'İçecek Bazları', 'ar', 'قواعد المشروبات'))
  ) as t(parent_slug, slug, ad)
)
insert into public.kategoriler (ad, slug, ust_kategori_id, urun_gami)
select n.ad, n.slug, p.id, 'barista-bakery-essentials'
from new_categories n
join parent_map p on p.slug = n.parent_slug
where not exists (
  select 1 from public.kategoriler existing where existing.slug = n.slug
);

with template_rows as (
  select * from (
    values
      ('cakes-and-tarts', 'saklama_derecesi', 'metin', 6, 'Lagertemperatur', 'Storage Temperature', 'Saklama Derecesi', 'درجة التخزين'),
      ('cookies-and-muffins', 'kutu_ici_adet', 'sayı', 0, 'Stück pro Box', 'Units per Box', 'Kutu İçi Adet', 'عدد القطع في الصندوق'),
      ('cookies-and-muffins', 'net_agirlik_gram', 'sayı', 1, 'Netto-Gewicht (g)', 'Net Weight (g)', 'Net Ağırlık (g)', 'الوزن الصافي (غ)'),
      ('cookies-and-muffins', 'saklama_suresi', 'metin', 2, 'Lagerdauer', 'Storage Duration', 'Saklama Süresi', 'مدة التخزين'),
      ('coffee', 'hacim_ml', 'sayı', 0, 'Flaschenvolumen (ml)', 'Bottle Volume (ml)', 'Şişe Hacmi (ml)', 'حجم العبوة (مل)'),
      ('coffee', 'aroma_profili', 'metin', 1, 'Aromaprofil', 'Aroma Profile', 'Aroma Profili', 'ملف النكهة'),
      ('coffee', 'kullanim_alani', 'metin', 2, 'Empfohlene Nutzung', 'Recommended Use', 'Kullanım Alanı', 'مجال الاستخدام'),
      ('coffee', 'sertifikasyon', 'metin', 3, 'Zertifizierung', 'Certification', 'Sertifikasyon', 'الشهادات'),
      ('sauces-and-ingredients', 'ambalaj_boyutu', 'metin', 0, 'Verpackungsgröße', 'Pack Size', 'Ambalaj Boyutu', 'حجم العبوة'),
      ('sauces-and-ingredients', 'dogallik_notu', 'metin', 1, 'Natürlichkeitsnotiz', 'Naturalness Note', 'Doğallık Notu', 'ملاحظة الطبيعة'),
      ('sauces-and-ingredients', 'katki_bilgisi', 'metin', 2, 'Zusatzstoff-Info', 'Additive Note', 'Katkı Bilgisi', 'معلومات الإضافات'),
      ('sauces-and-ingredients', 'yogunluk_seviyesi', 'metin', 3, 'Konsistenz', 'Texture / Density', 'Yoğunluk', 'الكثافة'),
      ('drinks', 'servis_orani', 'metin', 1, 'Mischverhältnis', 'Serving Ratio', 'Servis Oranı', 'نسبة التحضير'),
      ('drinks', 'hazirlama_notu', 'metin', 2, 'Zubereitung', 'Preparation Note', 'Hazırlama Notu', 'ملاحظة التحضير')
  ) as t(category_slug, alan_adi, alan_tipi, sira, de_label, en_label, tr_label, ar_label)
)
insert into public.kategori_ozellik_sablonlari (
  kategori_id,
  alan_adi,
  alan_tipi,
  gosterim_adi,
  sira,
  public_gorunur,
  musteri_gorunur,
  alt_bayi_gorunur
)
select
  k.id,
  t.alan_adi,
  t.alan_tipi,
  jsonb_build_object('de', t.de_label, 'en', t.en_label, 'tr', t.tr_label, 'ar', t.ar_label),
  t.sira,
  true,
  true,
  true
from template_rows t
join public.kategoriler k on k.slug = t.category_slug
where not exists (
  select 1
  from public.kategori_ozellik_sablonlari existing
  where existing.kategori_id = k.id and existing.alan_adi = t.alan_adi
);

commit;
