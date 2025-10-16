// src/app/admin/crm/firmalar/[firmaId]/gorevler/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiPlus, FiCalendar, FiFlag, FiUser } from 'react-icons/fi';
import { firmaIcinGorevEkleAction } from './actions';
import TamamlaButton from './TamamlaButton';
import GeriAlButton from './GeriAlButton'; // Geri Al butonunu import ediyoruz

export default async function FirmaGorevleriPage({ params }: { params: { firmaId: string } }) {
    const supabase = createSupabaseServerClient();

    // Paralel veri çekme
    const [gorevlerRes, profillerRes] = await Promise.all([
        supabase.from('gorevler').select(`
            *,
            atanan_profil: profiller!atanan_kisi_id(tam_ad),
            olusturan_profil: profiller!olusturan_kisi_id(tam_ad)
        `)
            .eq('ilgili_firma_id', params.firmaId)
            .order('tamamlandi').order('son_tarih', { ascending: true }),
        supabase.from('profiller').select('id, tam_ad').order('tam_ad')
    ]);

    const { data: gorevler, error: gorevlerError } = gorevlerRes;
    const { data: profiller, error: profillerError } = profillerRes;
    
    if (gorevlerError || profillerError) {
        console.error("Firma Görevleri Sayfası Veri Çekme Hatası:", gorevlerError || profillerError);
        return <div>Görevler veya personel bilgileri yüklenirken bir hata oluştu.</div>;
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Tarih Yok';
        return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' });
    };
    
    const formAction = firmaIcinGorevEkleAction.bind(null, params.firmaId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sol Taraf: Yeni Görev Ekleme */}
            <div className="lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Yeni Görev Ata</h2>
                <form action={formAction} className="space-y-4 p-4 bg-secondary/50 rounded-lg border">
                    <div>
                        <label htmlFor="baslik" className="block text-sm font-bold text-text-main/80 mb-2">Başlık</label>
                        <input type="text" id="baslik" name="baslik" required className="w-full bg-white border border-bg-subtle rounded-lg p-2 text-sm" />
                    </div>
                    <div>
                        <label htmlFor="atanan_kisi_id" className="block text-sm font-bold text-text-main/80 mb-2">Atanan Personel</label>
                        <select name="atanan_kisi_id" required className="w-full bg-white border border-bg-subtle rounded-lg p-2 text-sm">
                            <option value="">Seçin...</option>
                            {profiller?.map(p => <option key={p.id} value={p.id}>{p.tam_ad}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="son_tarih" className="block text-sm font-bold text-text-main/80 mb-2">Son Tarih</label>
                        <input type="date" id="son_tarih" name="son_tarih" className="w-full bg-white border border-bg-subtle rounded-lg p-2 text-sm" />
                    </div>
                    <div>
                        <label htmlFor="oncelik" className="block text-sm font-bold text-text-main/80 mb-2">Öncelik</label>
                        <select name="oncelik" defaultValue="Orta" className="w-full bg-white border border-bg-subtle rounded-lg p-2 text-sm">
                            <option>Düşük</option>
                            <option>Orta</option>
                            <option>Yüksek</option>
                        </select>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg font-bold text-sm">
                            <FiPlus /> Görev Ekle
                        </button>
                    </div>
                </form>
            </div>

            {/* Sağ Taraf: Görev Listesi */}
            <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Firmaya Ait Görevler</h2>
                <div className="space-y-3">
                    {gorevler && gorevler.length > 0 ? (
                        gorevler.map(gorev => {
                            const isCompleted = gorev.tamamlandi;
                            const oncelikRenk = gorev.oncelik === 'Yüksek' ? 'border-red-500' : gorev.oncelik === 'Orta' ? 'border-yellow-500' : 'border-blue-500';

                            return (
                                <div key={gorev.id} className={`p-4 bg-white rounded-lg border-l-4 flex items-center gap-4 ${isCompleted ? 'border-gray-200 opacity-60' : oncelikRenk}`}>
                                    <div className="flex-grow">
                                        <p className={`font-bold ${isCompleted ? 'line-through text-gray-500' : 'text-primary'}`}>{gorev.baslik}</p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-main/70 mt-1">
                                            <span className="flex items-center gap-1.5"><FiCalendar/> {formatDate(gorev.son_tarih)}</span>
                                            {/* @ts-ignore */}
                                            <span className="flex items-center gap-1.5"><FiUser/> {gorev.atanan_profil?.tam_ad || 'Atanmamış'}</span>
                                            <span className="flex items-center gap-1.5"><FiFlag/> {gorev.oncelik}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Görevin durumuna göre ya 'Tamamla' ya da 'Geri Al' butonunu gösteriyoruz */}
                                    {isCompleted ? (
                                        <GeriAlButton gorevId={gorev.id} firmaId={params.firmaId} />
                                    ) : (
                                        <TamamlaButton gorevId={gorev.id} firmaId={params.firmaId} />
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center p-8 border-2 border-dashed rounded-lg text-text-main/70">Bu firmaya atanmış bir görev bulunmuyor.</p>
                    )}
                </div>
            </div>
        </div>
    );
}