import { UrunFormu } from '@/components/urun-formu';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLocalizedName } from '@/lib/utils';
import { Tables } from '@/lib/supabase/database.types';

export default async function KapsamliUrunDuzenlemePage({ params }: { params: { urunId: string } }) {
    const supabase = createSupabaseServerClient();

    // Sicherheit: Nur Administratoren haben Zugriff.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'Yönetici') {
        return <div className="p-8 text-center text-red-500 font-semibold">Zugriff verweigert.</div>;
    }

    // Alle notwendigen Daten parallel abrufen, um das Formular zu füllen.
    const [urunRes, kategorienRes, tedarikcilerRes] = await Promise.all([
        supabase.from('urunler').select('*').eq('id', params.urunId).single(),
        supabase.from('kategoriler').select('id, ad, ust_kategori_id, teknik_ozellik_sablonu'),
        supabase.from('tedarikciler').select('id, ad')
    ]);

    const { data: mevcutUrun, error: urunError } = urunRes;
    if (urunError || !mevcutUrun) {
        return <div className="p-8 text-center">Produkt nicht gefunden.</div>
    }
    
    // Wir müssen die Typen für die Übergabe an die Komponente sicherstellen.
    const kategorien: Tables<'kategoriler'>[] = kategorienRes.data || [];
    const tedarikciler: Pick<Tables<'tedarikciler'>, 'id' | 'ad'>[] = tedarikcilerRes.data || [];

    return (
        <div className="space-y-8">
             <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Umfassende Produktbearbeitung</h1>
                <p className="text-text-main/80 mt-1">Bearbeiten Sie hier alle Marketing- und Detailinformationen des Produkts.</p>
             </header>
            
            <UrunFormu 
                mevcutUrun={mevcutUrun}
                kategorien={kategorien}
                tedarikciler={tedarikciler}
            />
        </div>
    );
}