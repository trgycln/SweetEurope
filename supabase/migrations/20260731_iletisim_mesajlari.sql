create table public.iletisim_mesajlari (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  ad_soyad character varying not null,
  email character varying not null,
  mesaj text not null,
  okundu_mu boolean not null default false,
  okunma_tarihi timestamp with time zone null,
  constraint iletisim_mesajlari_pkey primary key (id)
);

-- Enable RLS
alter table public.iletisim_mesajlari enable row level security;

-- Policies
create policy "Enable insert for everyone" on public.iletisim_mesajlari for insert with check (true);
create policy "Enable read access for service role only" on public.iletisim_mesajlari for select using (true);
create policy "Enable update for service role only" on public.iletisim_mesajlari for update using (true);
create policy "Enable delete for service role only" on public.iletisim_mesajlari for delete using (true);
