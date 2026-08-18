import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiUserPlus } from 'react-icons/fi';
import { yeniKisiEkleAction } from './actions';
import KisiKarti from './KisiKarti';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { Tables } from '@/lib/supabase/database.types';

interface IlgiliKisilerPageProps {
    params: Promise<{
        locale: Locale;
        firmaId: string;
    }>;
}

type Kisi = Tables<'dis_kontaklar'>;

export default async function IlgiliKisilerPage({ params }: IlgiliKisilerPageProps) {
    const { firmaId, locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: kisilerData, error } = await supabase
        .from('dis_kontaklar')
        .select('*')
        .eq('firma_id', firmaId)
        .order('ad_soyad');

    if (error) {
        console.error("Fehler beim Laden der Kontakte:", error);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Fehler beim Laden der Kontakte. Details: {error.message}</div>;
    }

    const kisiler: Kisi[] = kisilerData || [];

    async function handleCreate(formData: FormData) {
        'use server';
        await yeniKisiEkleAction(firmaId, formData);
    }

    const inputBaseClasses = "w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Neuen Kontakt hinzufügen</h2>
                <form action={handleCreate} className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                        <label htmlFor="ad_soyad" className="block text-sm font-bold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                        <input type="text" id="ad_soyad" name="ad_soyad" required className={inputBaseClasses} />
                    </div>
                    <div>
                        <label htmlFor="unvan" className="block text-sm font-bold text-gray-700 mb-1">Position</label>
                        <input type="text" id="unvan" name="unvan" placeholder="z.B. Einkaufsleiter" className={inputBaseClasses} />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1">E-Mail</label>
                        <input type="email" id="email" name="email" className={inputBaseClasses} />
                    </div>
                    <div>
                        <label htmlFor="telefon" className="block text-sm font-bold text-gray-700 mb-1">Telefon</label>
                        <input type="tel" id="telefon" name="telefon" className={inputBaseClasses} />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm transition disabled:opacity-50"
                        >
                            <FiUserPlus size={16} /> Kontakt hinzufügen
                        </button>
                    </div>
                </form>
            </div>

            <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Kontakte</h2>
                <div className="space-y-4">
                    {kisiler.length > 0 ? (
                        kisiler.map(kisi => (
                            <KisiKarti key={kisi.id} kisi={kisi} locale={locale} />
                        ))
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                            <p className="text-gray-500">Für diese Firma wurden noch keine Kontakte erfasst.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}