-- Alt Bayi Satis (Ön Fatura) tabloları
-- Not: gen_random_uuid() kullanılabilmesi için pgcrypto etkin olmalıdır (Supabase'de varsayılan olarak etkindir)

create table if not exists public.alt_bayi_satislar (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  bayi_firma_id uuid not null references public.firmalar(id) on delete restrict,
  musteri_id uuid not null references public.firmalar(id) on delete restrict,
  durum text not null default 'Taslak', -- Taslak | Onaylandı | Faturalandı | Iptal
  kdv_orani numeric not null default 0.07, -- %7 varsayılan
  toplam_net numeric not null default 0,
  toplam_kdv numeric not null default 0,
  toplam_brut numeric not null default 0,
  on_fatura_no text,
  on_fatura_pdf_url text
);

create table if not exists public.alt_bayi_satis_detay (
  id uuid primary key default gen_random_uuid(),
  satis_id uuid not null references public.alt_bayi_satislar(id) on delete cascade,
  urun_id uuid not null references public.urunler(id) on delete restrict,
  adet numeric not null default 1,
  birim_fiyat_net numeric not null default 0, -- alt bayinin müşterisine satışı (net)
  satir_net numeric not null default 0,
  kdv_tutari numeric not null default 0,
  satir_brut numeric not null default 0,
  alis_birim_fiyati numeric not null default 0 -- bizden alış fiyatı (snapshot: urun.satis_fiyati_alt_bayi)
);

-- RLS etkinleştir
alter table public.alt_bayi_satislar enable row level security;
alter table public.alt_bayi_satis_detay enable row level security;

-- Politika: Sadece kendi bayi_firma_id'sine sahip kayıtları görsün/oluştursun/güncellesin
drop policy if exists alt_bayi_satislar_select on public.alt_bayi_satislar;
create policy alt_bayi_satislar_select on public.alt_bayi_satislar
for select using (
  exists (
    select 1 from public.profiller p
    where p.id = auth.uid() and p.firma_id = alt_bayi_satislar.bayi_firma_id
  )
);

drop policy if exists alt_bayi_satislar_insert on public.alt_bayi_satislar;
create policy alt_bayi_satislar_insert on public.alt_bayi_satislar
for insert with check (
  exists (
    select 1 from public.profiller p
    where p.id = auth.uid() and p.firma_id = bayi_firma_id
  )
);

drop policy if exists alt_bayi_satislar_update on public.alt_bayi_satislar;
create policy alt_bayi_satislar_update on public.alt_bayi_satislar
for update using (
  exists (
    select 1 from public.profiller p
    where p.id = auth.uid() and p.firma_id = alt_bayi_satislar.bayi_firma_id
  )
);

drop policy if exists alt_bayi_satis_detay_select on public.alt_bayi_satis_detay;
create policy alt_bayi_satis_detay_select on public.alt_bayi_satis_detay
for select using (
  exists (
    select 1 from public.alt_bayi_satislar s
    join public.profiller p on p.id = auth.uid()
    where s.id = alt_bayi_satis_detay.satis_id and s.bayi_firma_id = p.firma_id
  )
);

drop policy if exists alt_bayi_satis_detay_insert on public.alt_bayi_satis_detay;
create policy alt_bayi_satis_detay_insert on public.alt_bayi_satis_detay
for insert with check (
  exists (
    select 1 from public.alt_bayi_satislar s
    join public.profiller p on p.id = auth.uid()
    where s.id = alt_bayi_satis_detay.satis_id and s.bayi_firma_id = p.firma_id
  )
);

drop policy if exists alt_bayi_satis_detay_update on public.alt_bayi_satis_detay;
create policy alt_bayi_satis_detay_update on public.alt_bayi_satis_detay
for update using (
  exists (
    select 1 from public.alt_bayi_satislar s
    join public.profiller p on p.id = auth.uid()
    where s.id = alt_bayi_satis_detay.satis_id and s.bayi_firma_id = p.firma_id
  )
);
