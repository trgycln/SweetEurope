-- =====================================================
-- Detaylı P&L Raporu - Alt kalemleri dahil eden fonksiyon
-- Her kategorinin altındaki gider kalemlerini ve her kalemin altındaki detayları gösterir
-- =====================================================

CREATE OR REPLACE FUNCTION get_detailed_pl_report(
    start_date DATE,
    end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    total_gross_revenue NUMERIC := 0;
    total_revenue NUMERIC := 0;
    total_cogs NUMERIC := 0;
    gross_profit NUMERIC := 0;
    total_expenses NUMERIC := 0;
    net_profit NUMERIC := 0;
    expense_data JSON;
BEGIN
    -- Brüt Ciro hesaplama (şimdilik Net Ciro ile aynı, gerekirse ayarlayın)
    SELECT COALESCE(SUM(toplam_tutar), 0) INTO total_gross_revenue
    FROM siparisler
    WHERE durum IN ('teslim_edildi', 'yolda')
    AND tarih BETWEEN start_date AND end_date;
    
    -- Net Ciro (şimdilik aynı, ileride KDV vs. çıkarılabilir)
    total_revenue := total_gross_revenue;
    
    -- COGS hesaplama (şimdilik placeholder)
    total_cogs := 0;
    
    -- Brüt kâr
    gross_profit := total_revenue - total_cogs;
    
    -- Giderler - ANA KATEGORİ bazında, içinde KALEMLER ve DETAYLAR
    WITH expense_categories AS (
        SELECT 
            gak.id as kategori_id,
            gak.ad as kategori_adi,
            json_agg(
                json_build_object(
                    'kalem_id', gk.id,
                    'kalem_adi', gk.ad,
                    'detaylar', (
                        SELECT json_agg(
                            json_build_object(
                                'id', g.id,
                                'tarih', g.tarih,
                                'tutar', g.tutar,
                                'aciklama', g.aciklama
                            )
                        )
                        FROM giderler g
                        WHERE g.gider_kalemi_id = gk.id
                        AND g.tarih BETWEEN start_date AND end_date
                        AND g.durum = 'onaylandi'
                    ),
                    'toplam', (
                        SELECT COALESCE(SUM(g.tutar), 0)
                        FROM giderler g
                        WHERE g.gider_kalemi_id = gk.id
                        AND g.tarih BETWEEN start_date AND end_date
                        AND g.durum = 'onaylandi'
                    )
                )
            ) as kalemler,
            (
                SELECT COALESCE(SUM(g.tutar), 0)
                FROM giderler g
                INNER JOIN gider_kalemleri gk2 ON g.gider_kalemi_id = gk2.id
                WHERE gk2.ana_kategori_id = gak.id
                AND g.tarih BETWEEN start_date AND end_date
                AND g.durum = 'onaylandi'
            ) as kategori_toplam
        FROM gider_ana_kategoriler gak
        LEFT JOIN gider_kalemleri gk ON gk.ana_kategori_id = gak.id
        GROUP BY gak.id, gak.ad
    )
    SELECT json_agg(
        json_build_object(
            'kategori', kategori_adi,
            'toplam', kategori_toplam,
            'kalemler', kalemler
        )
    ) INTO expense_data
    FROM expense_categories
    WHERE kategori_toplam > 0;
    
    -- Toplam giderler
    SELECT COALESCE(SUM(tutar), 0) INTO total_expenses
    FROM giderler
    WHERE tarih BETWEEN start_date AND end_date
    AND durum = 'onaylandi';
    
    -- Net kâr
    net_profit := gross_profit - total_expenses;
    
    -- Sonuç JSON
    result := json_build_object(
        'totalGrossRevenue', total_gross_revenue,
        'totalRevenue', total_revenue,
        'totalCogs', total_cogs,
        'grossProfit', gross_profit,
        'totalExpenses', total_expenses,
        'netProfit', net_profit,
        'expenseBreakdown', COALESCE(expense_data, '[]'::json)
    );
    
    RETURN result;
END;
$$;

-- Yorum ekle
COMMENT ON FUNCTION get_detailed_pl_report(DATE, DATE) IS 'Detaylı P&L raporu - her kategorinin altında kalemler ve detaylar';
