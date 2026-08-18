// src/app/[locale]/admin/crm/firmalar/[firmaId]/gorevler/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiPlus, FiCalendar, FiFlag, FiUser } from 'react-icons/fi';
import { firmaIcinGorevEkleAction } from './actions';
import TamamlaButton from './TamamlaButton';
import GeriAlButton from './GeriAlButton';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { Tables } from '@/lib/supabase/database.types';
import { unstable_noStore as noStore } from 'next/cache';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

type GorevWithProfil = Tables<'gorevler'> & {
    atanan_profil: Pick<Tables<'profiller'>, 'tam_ad'> | null;
    olusturan_profil: Pick<Tables<'profiller'>, 'tam_ad'> | null;
};

type ProfilOption = Pick<Tables<'profiller'>, 'id' | 'tam_ad'>;

interface FirmaGorevleriPageProps {
    params: Promise<{
        locale: Locale;
        firmaId: string;
    }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FirmaGorevleriPage({ params }: FirmaGorevleriPageProps) {
    const { firmaId, locale } = await params;
    noStore();

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return redirect(`/${locale}/login?next=/admin/crm/firmalar/${firmaId}/gorevler`);
    }

    const [gorevlerRes, profillerRes] = await Promise.all([
        supabase.from('gorevler').select(`
            *,
            atanan_profil: profiller!atanan_kisi_id(tam_ad),
            olusturan_profil: profiller!olusturan_kisi_id(tam_ad)
        `)
            .eq('ilgili_firma_id', firmaId)
            .order('tamamlandi', { ascending: true })
            .order('son_tarih', { ascending: true, nullsFirst: false }),
        supabase.from('profiller')
            .select('id, tam_ad')
            .order('tam_ad')
    ]);

    const { data: gorevlerData, error: gorevlerError } = gorevlerRes;
    const { data: profilerData, error: profillerError } = profillerRes;

    if (gorevlerError || profillerError) {
        console.error("Fehler beim Laden der Aufgaben oder Profile:", gorevlerError || profillerError);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Fehler beim Laden der Daten. Details in den Server-Logs.</div>;
    }

    const gorevler: GorevWithProfil[] = (gorevlerData as any) || [];
    const profiller: ProfilOption[] = profilerData || [];

    const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return 'Tarih yok';
        try {
            return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
        } catch {
            return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
        }
    };

    async function handleFormAction(formData: FormData) {
        'use server';
        await firmaIcinGorevEkleAction(firmaId, formData);
    }
    const inputBaseClasses = "w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-accent focus:border-accent";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Yeni Görev Ekle</h2>
                <form action={handleFormAction} className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                        <label htmlFor="baslik" className="block text-sm font-bold text-gray-700 mb-1">Başlık <span className="text-red-500">*</span></label>
                        <input type="text" id="baslik" name="baslik" required className={inputBaseClasses} />
                    </div>
                    <div>
                        <label htmlFor="atanan_kisi_id" className="block text-sm font-bold text-gray-700 mb-1">Atanan Kişi <span className="text-red-500">*</span></label>
                        <select id="atanan_kisi_id" name="atanan_kisi_id" required className={inputBaseClasses}>
                            <option value="" disabled>Seçiniz...</option>
                            {profiller.map(p => <option key={p.id} value={p.id}>{p.tam_ad || `ID: ${p.id}`}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="son_tarih" className="block text-sm font-bold text-gray-700 mb-1">Son Tarih</label>
                        <input type="date" id="son_tarih" name="son_tarih" className={inputBaseClasses} />
                    </div>
                    <div>
                        <label htmlFor="oncelik" className="block text-sm font-bold text-gray-700 mb-1">Öncelik</label>
                        <select id="oncelik" name="oncelik" defaultValue="Orta" className={inputBaseClasses}>
                            <option value="Düşük">Düşük</option>
                            <option value="Orta">Orta</option>
                            <option value="Yüksek">Yüksek</option>
                            <option value="Acil">Acil</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="aciklama" className="block text-sm font-bold text-gray-700 mb-1">Açıklama</label>
                        <textarea id="aciklama" name="aciklama" rows={3} className={inputBaseClasses}></textarea>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm transition disabled:opacity-50"
                        >
                            <FiPlus size={16} /> Görev Ekle
                        </button>
                    </div>
                </form>
            </div>

            <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Görevler</h2>
                <div className="space-y-4">
                    {gorevler.length > 0 ? (
                        gorevler.map(gorev => (
                            <div key={gorev.id} className={`p-4 rounded-lg border ${gorev.tamamlandi ? 'bg-gray-100 border-gray-200 opacity-70' : 'bg-white border-gray-200'} shadow-sm flex items-start justify-between gap-4`}>
                                <div className="space-y-2 flex-grow">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                            (gorev.oncelik as string) === 'Acil' ? 'bg-red-100 text-red-700' :
                                            gorev.oncelik === 'Yüksek' ? 'bg-orange-100 text-orange-700' :
                                            gorev.oncelik === 'Orta' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {gorev.oncelik}
                                        </span>
                                        <h3 className={`font-bold text-base ${gorev.tamamlandi ? 'line-through text-gray-500' : 'text-gray-900'}`}>{gorev.baslik}</h3>
                                    </div>
                                    {gorev.aciklama && <p className="text-sm text-gray-600">{gorev.aciklama}</p>}
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                                        {gorev.son_tarih && (
                                            <span className="flex items-center gap-1">
                                                <FiCalendar /> {formatDate(gorev.son_tarih)}
                                            </span>
                                        )}
                                        {gorev.atanan_profil && (
                                            <span className="flex items-center gap-1">
                                                <FiUser /> {gorev.atanan_profil.tam_ad}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    {gorev.tamamlandi ? (
                                        <GeriAlButton gorevId={gorev.id} firmaId={firmaId} />
                                    ) : (
                                        <TamamlaButton gorevId={gorev.id} firmaId={firmaId} />
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                            <p className="text-gray-500">Bu firma için henüz görev bulunmuyor.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}