import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tables } from '@/lib/supabase/database.types';
import { AnaFiyatListesiClient } from '@/components/ana-fiyat-listesi-client';

export default async function AnaFiyatListesiPage() {
    const supabase = await createSupabaseServerClient();

    // Sicherheitsprüfung: Benutzer und Rolle überprüfen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'Yönetici') {
        return redirect('/admin/dashboard');
    }

    // ## HINZUGEFÜGT: Daten parallel abrufen (Produkte UND Kategorien) ##
    const [urunlerRes, kategorilerRes] = await Promise.all([
        supabase
            .from('urunler')
            .select(`*, kategoriler ( id, ad )`)
            .order('created_at', { ascending: false }),
        supabase
            .from('kategoriler')
            .select('id, ad')
    ]);
    
    const { data: urunler, error: urunlerError } = urunlerRes;
    const { data: kategoriler, error: kategorilerError } = kategorilerRes;


    if (urunlerError || kategorilerError) {
        const errorMessage = urunlerError?.message || kategorilerError?.message;
        return <div className="p-6 text-red-500">Fehler beim Laden der Daten: {errorMessage}</div>;
    }
    
    const typedUrunler: (Tables<'urunler'> & { kategoriler: Pick<Tables<'kategoriler'>, 'id' | 'ad'> | null })[] = urunler || [];

    return (
        <AnaFiyatListesiClient 
            serverUrunler={typedUrunler}
            // ## HINZUGEFÜGT: Die abgerufenen Kategorien werden jetzt als Prop übergeben ##
            serverKategoriler={kategoriler || []}
        />
    );
}