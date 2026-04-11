import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { FiArrowLeft, FiSave } from 'react-icons/fi';

import { Locale } from '@/i18n-config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { gorevGuncelleAction } from '../actions';

export const dynamic = 'force-dynamic';

type ProfilOption = Pick<Tables<'profiller'>, 'id' | 'tam_ad'>;
type FirmaOption = Pick<Tables<'firmalar'>, 'id' | 'unvan'>;
type GorevOncelik = Enums<'gorev_oncelik'>;

interface GorevDuzenlemePageProps {
    params: {
        locale: Locale;
        gorevId: string;
    };
}

export default async function GorevDuzenlemePage({
    params: { locale, gorevId },
}: GorevDuzenlemePageProps) {
    noStore();

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const [gorevRes, profillerRes, firmalarRes] = await Promise.all([
        supabase.from('gorevler').select('*').eq('id', gorevId).maybeSingle(),
        supabase.from('profiller').select('id, tam_ad').order('tam_ad'),
        supabase.from('firmalar').select('id, unvan').order('unvan'),
    ]);

    if (gorevRes.error || !gorevRes.data) {
        console.error('Görev yüklenemedi:', gorevRes.error);
        notFound();
    }

    const gorev = gorevRes.data;
    const profilOptions: ProfilOption[] = profillerRes.data || [];
    const firmaOptions: FirmaOption[] = firmalarRes.data || [];
    const oncelikOptions: GorevOncelik[] = ['Düşük', 'Orta', 'Yüksek'];
    const inputBaseClasses =
        'w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-gray-400';
    const sonTarihValue = gorev.son_tarih ? new Date(gorev.son_tarih).toISOString().split('T')[0] : '';

    async function handleUpdateAction(formData: FormData) {
        'use server';

        const result = await gorevGuncelleAction(
            gorevId,
            {
                baslik: (formData.get('baslik') as string) || '',
                aciklama: (formData.get('aciklama') as string) || null,
                son_tarih: (formData.get('son_tarih') as string) || null,
                atanan_kisi_id: (formData.get('atanan_kisi_id') as string) || '',
                ilgili_firma_id: (formData.get('ilgili_firma_id') as string) || null,
                oncelik: ((formData.get('oncelik') as GorevOncelik) || 'Orta') as GorevOncelik,
                tamamlandi: formData.get('tamamlandi') === 'on',
            },
            locale
        );

        if (result.error) {
            throw new Error(result.error);
        }

        redirect(`/${locale}/admin/gorevler`);
    }

    return (
        <>
            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link
                        href={`/${locale}/admin/gorevler`}
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors mb-4"
                    >
                        <FiArrowLeft />
                        Görev listesine dön
                    </Link>
                    <h1 className="font-serif text-4xl font-bold text-primary">Görevi düzenle</h1>
                    <p className="text-text-main/80 mt-1">
                        Atanan kişiyi, tarihi, önceliği ve açıklamayı bu ekrandan güncelleyebilirsiniz.
                    </p>
                </div>
                <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        gorev.tamamlandi ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}
                >
                    {gorev.tamamlandi ? 'Tamamlandı' : 'Açık görev'}
                </span>
            </header>

            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200">
                <form action={handleUpdateAction} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        <div className="md:col-span-2">
                            <label htmlFor="baslik" className="block text-sm font-bold text-gray-700 mb-2">
                                Görev başlığı <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="baslik"
                                name="baslik"
                                required
                                defaultValue={gorev.baslik}
                                className={inputBaseClasses}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="aciklama" className="block text-sm font-bold text-gray-700 mb-2">
                                Açıklama
                            </label>
                            <textarea
                                id="aciklama"
                                name="aciklama"
                                rows={5}
                                defaultValue={gorev.aciklama || ''}
                                className={inputBaseClasses}
                                placeholder="Görev detayları"
                            />
                        </div>

                        <div>
                            <label htmlFor="atanan_kisi_id" className="block text-sm font-bold text-gray-700 mb-2">
                                Atanan personel <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="atanan_kisi_id"
                                name="atanan_kisi_id"
                                required
                                defaultValue={gorev.atanan_kisi_id}
                                className={inputBaseClasses}
                            >
                                <option value="">-- Personel seçin --</option>
                                {profilOptions.map((profil) => (
                                    <option key={profil.id} value={profil.id}>
                                        {profil.tam_ad}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="ilgili_firma_id" className="block text-sm font-bold text-gray-700 mb-2">
                                İlgili firma
                            </label>
                            <select
                                id="ilgili_firma_id"
                                name="ilgili_firma_id"
                                defaultValue={gorev.ilgili_firma_id || ''}
                                className={inputBaseClasses}
                            >
                                <option value="">-- Firma seçin --</option>
                                {firmaOptions.map((firma) => (
                                    <option key={firma.id} value={firma.id}>
                                        {firma.unvan}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="oncelik" className="block text-sm font-bold text-gray-700 mb-2">
                                Öncelik
                            </label>
                            <select
                                id="oncelik"
                                name="oncelik"
                                required
                                defaultValue={gorev.oncelik}
                                className={inputBaseClasses}
                            >
                                {oncelikOptions.map((oncelik) => (
                                    <option key={oncelik} value={oncelik}>
                                        {oncelik}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="son_tarih" className="block text-sm font-bold text-gray-700 mb-2">
                                Son tarih
                            </label>
                            <input
                                type="date"
                                id="son_tarih"
                                name="son_tarih"
                                defaultValue={sonTarihValue}
                                className={inputBaseClasses}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    id="tamamlandi"
                                    name="tamamlandi"
                                    defaultChecked={gorev.tamamlandi}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                                />
                                Görev tamamlandı olarak işaretlensin
                            </label>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200 flex justify-end">
                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm"
                        >
                            <FiSave size={18} />
                            Değişiklikleri kaydet
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
