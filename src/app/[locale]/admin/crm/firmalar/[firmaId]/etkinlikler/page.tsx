import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import EtkinlikKarti from './EtkinlikKarti';
import EtkinlikEkleForm from './EtkinlikEkleForm';

type EtkinlikTipi = Enums<'etkinlik_tipi'>;

function zamanFarkiFormatla(tarihStr: string | null, timeDict: any): string {
    if (!tarihStr) return '';
    const tarih = new Date(tarihStr);
    const simdi = new Date();
    if (isNaN(tarih.getTime())) return '';

    const farkSaniye = Math.floor((simdi.getTime() - tarih.getTime()) / 1000);

    if (farkSaniye < 60) return timeDict?.justNow || 'Az önce';
    let aralik = Math.floor(farkSaniye / 60);
    if (aralik < 60) return aralik + " " + (timeDict?.minutesAgo || 'dk önce');
    aralik = Math.floor(farkSaniye / 3600);
    if (aralik < 24) return aralik + " " + (timeDict?.hoursAgo || 'saat önce');
    aralik = Math.floor(farkSaniye / 86400);
    if (aralik < 30) return aralik + " " + (timeDict?.daysAgo || 'gün önce');
    aralik = Math.floor(farkSaniye / 2592000);
    if (aralik < 12) return aralik + " " + (timeDict?.monthsAgo || 'ay önce');
    aralik = Math.floor(farkSaniye / 31536000);
    return aralik + " " + (timeDict?.yearsAgo || 'yıl önce');
}

interface EtkinliklerPageProps {
    params: Promise<{
        locale: Locale;
        firmaId: string;
    }>;
}

export default async function EtkinliklerPage({ params }: EtkinliklerPageProps) {
    const { firmaId, locale } = await params;
    const dict = await getDictionary(locale);
    const t = (dict as any).adminDashboard?.crmPage?.activities || {};

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return redirect(`/${locale}/login?next=/admin/crm/firmalar/${firmaId}/etkinlikler`);
    }

    const { data: etkinliklerData, error } = await supabase
        .from('etkinlikler')
        .select(`
            *,
            olusturan_personel: profiller!olusturan_personel_id (tam_ad)
        `)
        .eq('firma_id', firmaId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fehler beim Laden der Aktivitäten:", error);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">{t.errorLoading || 'Hata'}</div>;
    }

    const etkinlikListesi: any[] = etkinliklerData || [];
    const etkinlikTipleri: EtkinlikTipi[] = ['Not', 'Telefon Görüşmesi', 'Toplantı', 'E-posta', 'Teklif'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">{t.newActivityTitle || 'Yeni Aktivite'}</h2>
                <EtkinlikEkleForm 
                    firmaId={firmaId} 
                    locale={locale} 
                    etkinlikTipleri={etkinlikTipleri}
                    dict={t.form || {}}
                />
            </div>

            <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">{t.activityHistoryTitle || 'Aktivite Geçmişi'}</h2>
                <div className="space-y-6">
                    {etkinlikListesi.length > 0 ? (
                        etkinlikListesi.map(etkinlik => {
                            const zamanFarki = zamanFarkiFormatla(etkinlik.created_at, t.time);

                            return (
                                <EtkinlikKarti
                                    key={etkinlik.id}
                                    etkinlik={etkinlik}
                                    zamanFarki={zamanFarki}
                                    ikonAdi={etkinlik.etkinlik_tipi || ''}
                                    currentUser={user}
                                    dict={t.card || {}}
                                />
                            );
                        })
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                            <p className="text-gray-500">{t.noActivities || 'Henüz aktivite bulunmuyor.'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}