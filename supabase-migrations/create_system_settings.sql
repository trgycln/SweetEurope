-- Create system_settings table for global application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key varchar(100) NOT NULL UNIQUE,
  setting_value text NOT NULL,
  setting_type varchar(20) NOT NULL DEFAULT 'text', -- 'number', 'text', 'boolean'
  description text,
  category varchar(50) DEFAULT 'general',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  BEGIN
    CREATE POLICY system_settings_admin_full ON public.system_settings
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.rol = 'Yönetici'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.rol = 'Yönetici'
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY system_settings_read_all ON public.system_settings
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

-- Insert default pricing calculation values
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, category) VALUES
  ('pricing_shipping_per_box', '0.56', 'number', 'Kutu başı nakliye maliyeti (€)', 'pricing'),
  ('pricing_customs_percent', '7', 'number', 'Gümrük vergisi oranı (%)', 'pricing'),
  ('pricing_storage_per_box', '0.08', 'number', 'Kutu başı depolama maliyeti (€)', 'pricing'),
  ('pricing_operational_percent', '10', 'number', 'Operasyonel giderler oranı (%)', 'pricing'),
  ('pricing_distributor_margin', '25', 'number', 'Distribütör marjı (%)', 'pricing'),
  ('pricing_dealer_margin_default', '20', 'number', 'Varsayılan alt bayi marjı (%)', 'pricing'),
  ('pricing_round_step', '0.1', 'number', 'Fiyat yuvarlama adımı', 'pricing'),
  ('pricing_vat_rate', '7', 'number', 'KDV oranı (%)', 'pricing')
ON CONFLICT (setting_key) DO NOTHING;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trigger_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();