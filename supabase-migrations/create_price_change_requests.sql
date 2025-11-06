-- Create table for price change requests
create table if not exists public.fiyat_degisim_talepleri (
  id uuid primary key default gen_random_uuid(),
  urun_id uuid not null references public.urunler(id) on delete cascade,
  proposed_satis_fiyati_alt_bayi numeric,
  proposed_satis_fiyati_musteri numeric,
  notlar text,
  status text not null default 'Beklemede', -- Beklemede | Onaylandi | Reddedildi
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz
);

-- Optional: basic index
create index if not exists idx_fiyat_talep_urun on public.fiyat_degisim_talepleri(urun_id);
create index if not exists idx_fiyat_talep_status on public.fiyat_degisim_talepleri(status);

-- RLS (adjust as needed)
alter table public.fiyat_degisim_talepleri enable row level security;

-- Allow authenticated to insert their own requests
DO $$
BEGIN
  BEGIN
    CREATE POLICY fiyat_talep_insert ON public.fiyat_degisim_talepleri
      FOR INSERT TO authenticated
      WITH CHECK (created_by = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END
$$;

-- Allow users to view their own requests; admins will need a separate policy by role
DO $$
BEGIN
  BEGIN
    CREATE POLICY fiyat_talep_select_own ON public.fiyat_degisim_talepleri
      FOR SELECT TO authenticated
      USING (created_by = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END
$$;

-- NOTE: You likely want additional policies to allow admins (Yönetici) to list and approve all requests.
-- If you use a custom JWT claim for role, you can check it in policies.
