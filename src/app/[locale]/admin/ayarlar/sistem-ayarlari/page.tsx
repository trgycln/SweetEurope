import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SettingForm from './SettingForm';

export default async function SystemSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);
  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = profil?.rol === 'Yönetici';
  if (!isAdmin) return redirect(`/${locale}/admin`);

  const { data: settings } = await (supabase as any)
    .from('system_settings')
    .select('*')
    .eq('category', 'pricing')
    .order('setting_key', { ascending: true });

  const settingLabels: Record<string, string> = {
    'pricing_shipping_per_box': 'Kutu başı nakliye maliyeti (€)',
    'pricing_shipping_frozen_per_box': 'Soguk zincirli tedarikte kutu basi nakliye (€)',
    'pricing_shipping_non_cold_per_box': 'Soguk zincir disi tedarikte kutu basi nakliye (€)',
    'pricing_customs_percent': 'Gümrük vergisi oranı (%)',
    'pricing_customs_frozen_percent': 'Soguk zincirli tedarikte gumruk orani (%)',
    'pricing_customs_non_cold_percent': 'Soguk zincir disi tedarikte gumruk orani (%)',
    'pricing_storage_per_box': 'Kutu başı depolama maliyeti (€)',
    'pricing_operational_percent': 'Operasyonel giderler oranı (%)',
    'pricing_target_profit_percent': 'Varsayilan hedef kar orani (%)',
    'pricing_reseller_discount_percent': 'Varsayilan alt bayi indirimi (%)',
    'pricing_company_adjustment_percent': 'Varsayilan firma bazli ayar (%)',
    'pricing_distributor_margin': 'Distribütör marjı (%) - Bizim kârımız',
    'pricing_dealer_margin_default': 'Varsayılan alt bayi marjı (%)',
    'pricing_round_step': 'Fiyat yuvarlama adımı',
    'pricing_vat_rate': 'KDV oranı (%)'
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Sistem Ayarları - Fiyat Hesaplama</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="font-medium text-blue-900 mb-2">💡 Bilgi</h2>
        <p className="text-sm text-blue-700">
          Bu ayarlar fiyat hesaplama aracında varsayılan değerler olarak kullanılır. 
          Değişiklikler tüm kullanıcılar için geçerli olur ve yeni hesaplamalarda otomatik yüklenir.
        </p>
      </div>

      <div className="space-y-4">
        {(settings || []).map((setting: any) => (
          <SettingForm
            key={setting.id}
            setting={setting}
            label={settingLabels[setting.setting_key] || setting.setting_key}
            locale={locale}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Son Güncelleme</h3>
        <p className="text-sm text-gray-600">
          Değişiklikler anında tüm sistem genelinde etkili olur. 
          Fiyat hesaplama aracını yeniden açtığınızda güncel değerler yüklenecektir.
        </p>
      </div>
    </div>
  );
}