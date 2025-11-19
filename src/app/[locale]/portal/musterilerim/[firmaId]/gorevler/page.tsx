import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiPlus, FiCalendar, FiFlag, FiUser } from 'react-icons/fi';
import { addFirmTaskAction } from '../actions';
import TamamlaButton from './TamamlaButton';
import GeriAlButton from './GeriAlButton';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { Tables } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';

type GorevWithProfil = Tables<'gorevler'> & {
    atanan_profil: Pick<Tables<'profiller'>, 'tam_ad'> | null;
    olusturan_profil: Pick<Tables<'profiller'>, 'tam_ad'> | null;
};

type ProfilOption = Pick<Tables<'profiller'>, 'id' | 'tam_ad'>;

interface FirmaGorevleriPageProps {
    params: {
        locale: Locale;
        firmaId: string;
    };
}

export default async function MusteriGorevlerPage({ params }: FirmaGorevleriPageProps) {
    const { firmaId, locale } = params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div className="p-6 text-red-500">Oturum bulunamadı.</div>;

    const [gorevlerRes, profillerRes] = await Promise.all([
        supabase.from('gorevler').select(`
            *,
            atanan_profil: profiller!atanan_kisi_id(tam_ad),
            olusturan_profil: profiller!olusturan_kisi_id(tam_ad)
        `)
            .eq('sahip_id', user.id)
            .eq('ilgili_firma_id', firmaId)
            .order('tamamlandi', { ascending: true })
            .order('son_tarih', { ascending: true, nullsFirst: false }),
        supabase.from('profiller')
            .select('id, tam_ad')
            .eq('id', user.id)
    ]);

    const { data: gorevlerData, error: gorevlerError } = gorevlerRes;
    const { data: profilerData, error: profillerError } = profillerRes;

    if (gorevlerError || profillerError) {
        console.error("Görevler veya profiller yüklenirken hata:", gorevlerError || profillerError);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Veriler yüklenemedi.</div>;
    }

    const gorevler: GorevWithProfil[] = gorevlerData || [];
    const profiller: ProfilOption[] = profilerData || [];

    const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return 'Tarih yok';
        try {
            return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
        } catch {
            return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
        }
    };

    async function handleAddGorev(formData: FormData) {
        'use server';
        await addFirmTaskAction(firmaId, formData);
    }

    const inputBaseClasses = "w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-accent focus:border-accent";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Yeni Görev Ata</h2>
                <form action={handleAddGorev} className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                        <label htmlFor="baslik" className="block text-sm font-bold text-gray-700 mb-1">Başlık <span className="text-red-500">*</span></label>
                        <input type="text" id="baslik" name="baslik" required className={inputBaseClasses} />
                    </div>
                    <div>
                        <label htmlFor="atanan_kisi_id" className="block text-sm font-bold text-gray-700 mb-1">Atanan Kişi <span className="text-red-500">*</span></label>
                        <select id="atanan_kisi_id" name="atanan_kisi_id" required className={inputBaseClasses}>
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
                        </select>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition disabled:opacity-50">
                            <FiPlus /> Görev Ekle
                        </button>
                    </div>
                </form>
            </div>

            <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Bu Müşteri İçin Görevler</h2>
                <div className="space-y-3">
                    {gorevler.length > 0 ? (
                        gorevler.map(gorev => {
                            const isCompleted = gorev.tamamlandi;
                            const priorityColorClass = gorev.oncelik === 'Yüksek' ? 'border-red-500'
                                                    : gorev.oncelik === 'Orta' ? 'border-yellow-500'
                                                    : 'border-blue-500';
                            const bgColorClass = isCompleted ? 'bg-gray-50 opacity-70' : 'bg-white';
                            const borderColorClass = isCompleted ? 'border-gray-300' : priorityColorClass;

                            return (
                                <div key={gorev.id} className={`p-4 ${bgColorClass} rounded-lg border-l-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm ${borderColorClass}`}>
                                    <div className="flex-grow">
                                        <p className={`font-semibold ${isCompleted ? 'line-through text-gray-500' : 'text-primary'}`}>{gorev.baslik}</p>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                                            {gorev.son_tarih && (
                                                <span className="flex items-center gap-1">
                                                    <FiCalendar size={12}/> {formatDate(gorev.son_tarih)}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <FiUser size={12}/> {gorev.atanan_profil?.tam_ad || 'Atanmamış'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FiFlag size={12}/> {gorev.oncelik || 'Bilinmiyor'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 mt-2 sm:mt-0">
                                        {isCompleted ? (
                                            <GeriAlButton gorevId={gorev.id} firmaId={firmaId} />
                                        ) : (
                                            <TamamlaButton gorevId={gorev.id} firmaId={firmaId} />
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                            <p className="text-gray-500">Bu müşteri için henüz görev atanmamış.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
