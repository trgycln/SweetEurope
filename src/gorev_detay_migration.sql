-- =====================================================================
-- GÖREV DETAY SİSTEMİ — SUPABASE MIGRATION
-- gorev_notlari (notlar/gelişmeler) + alt_gorevler (subtasks)
-- Supabase Dashboard → SQL Editor'de çalıştırın
-- =====================================================================

-- ── 1. GÖREV NOTLARI ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gorev_notlari (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    gorev_id         UUID        NOT NULL REFERENCES public.gorevler(id) ON DELETE CASCADE,
    kullanici_id     UUID        NOT NULL REFERENCES public.profiller(id) ON DELETE CASCADE,
    not_metni        TEXT        NOT NULL,
    olusturma_tarihi TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gorev_notlari_gorev_id
    ON public.gorev_notlari (gorev_id, olusturma_tarihi DESC);

COMMENT ON TABLE  public.gorev_notlari              IS 'Görevlere eklenen notlar / gelişme kayıtları';
COMMENT ON COLUMN public.gorev_notlari.not_metni    IS 'Not içeriği (serbest metin)';
COMMENT ON COLUMN public.gorev_notlari.kullanici_id IS 'Notu ekleyen kullanıcı (profiller.id)';

-- ── 2. ALT GÖREVLER ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.alt_gorevler (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    gorev_id         UUID        NOT NULL REFERENCES public.gorevler(id) ON DELETE CASCADE,
    baslik           TEXT        NOT NULL,
    tamamlandi       BOOLEAN     DEFAULT FALSE NOT NULL,
    olusturma_tarihi TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alt_gorevler_gorev_id
    ON public.alt_gorevler (gorev_id, olusturma_tarihi ASC);

COMMENT ON TABLE  public.alt_gorevler            IS 'Görev başlıklarına bağlı alt görevler (checklist)';
COMMENT ON COLUMN public.alt_gorevler.tamamlandi IS 'true = alt görev tamamlandı';

-- ── 3. ROW LEVEL SECURITY ────────────────────────────────────────────────────

ALTER TABLE public.gorev_notlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alt_gorevler  ENABLE ROW LEVEL SECURITY;

-- İç ekip (Yönetici, Personel, Ekip Üyesi) tam erişim
CREATE POLICY "Ekip gorev_notlari erisimi" ON public.gorev_notlari
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiller
            WHERE id = auth.uid()
              AND rol IN ('Yönetici', 'Personel', 'Ekip Üyesi')
        )
    );

CREATE POLICY "Ekip alt_gorevler erisimi" ON public.alt_gorevler
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiller
            WHERE id = auth.uid()
              AND rol IN ('Yönetici', 'Personel', 'Ekip Üyesi')
        )
    );

-- ── 4. ÇALIŞTIRILACAK KOMUT ──────────────────────────────────────────────────
-- Tablolar oluşturulduktan sonra TypeScript tiplerini yenileyin:
-- npx supabase gen types typescript --project-id atydffkpyvxcmzxyibhj > src/lib/supabase/database.types.ts
