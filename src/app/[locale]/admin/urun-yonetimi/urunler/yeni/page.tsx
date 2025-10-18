// Pfad zum neuen Speicherort
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// KORREKTUR: Der Importpfad ist jetzt korrekt
import { UrunFormu } from '../urun-formu';

export default async function YeniUrunSayfasi({ params }: { params: { locale: string } }) {
    const supabase = createSupabaseServerClient();
    const locale = params.locale; // Locale dynamisch verwenden

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    // Daten parallel abrufen
    const [kategorilerRes, tedarikcilerRes, birimlerRes] = await Promise.all([
        supabase.from('kategoriler').select('*').order(`ad->>${locale}`),
        supabase.from('tedarikciler').select('id, unvan').order('unvan'),
        supabase.from('birimler').select('*').order(`ad->>${locale}`)
    ]);

    return (
        <div className="max-w-5xl mx-auto">
             {/* locale als Prop an das Formular übergeben */}
            <UrunFormu
                locale={locale}
                kategoriler={kategorilerRes.data || []}
                tedarikciler={tedarikcilerRes.data || []}
                birimler={birimlerRes.data || []}
            />
        </div>
    );
}
