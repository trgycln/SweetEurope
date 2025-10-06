// src/app/admin/crm/firmalar/[firmaId]/page.tsx (GÜNCELLENMİŞ HALİ)

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database, Tables, Enums } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { 
    FiArrowLeft, FiMapPin, FiPhone, FiMail, FiPercent, FiCalendar, FiEdit, FiFileText, 
    FiPlus, FiMessageSquare, FiTrendingUp, FiPhoneCall, FiMail as FiMailIcon, FiUsers, FiMoreHorizontal 
} from 'react-icons/fi';
import { revalidatePath } from 'next/cache';

// Tip Tanımları
type Firma = Tables<'firmalar'>;
type Finansal = Tables<'firmalar_finansal'>;
type Etkinlik = Tables<'etkinlikler'> & { profiller: Pick<Tables<'profiller'>, 'tam_ad'> | null };
type UserRole = Enums<'user_role'>;
type EtkinlikTuru = Enums<'etkinlik_turu'>;

// SERVER ACTION: Yeni etkinlik ekler
async function aktiviteEkleAction(formData: FormData) {
    'use server';
    const supabase = createSupabaseServerClient();
    
    const ozet = formData.get('ozet') as string;
    const tur = formData.get('tur') as EtkinlikTuru;
    const firmaId = formData.get('firmaId') as string;

    if (!ozet || !tur || !firmaId) {
        console.error("Özet, tür ve firma ID zorunludur.");
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('etkinlikler').insert({
        firma_id: firmaId,
        kullanici_id: user.id,
        tur: tur,
        ozet: ozet,
    });

    if (error) {
        console.error("Etkinlik eklenirken hata oluştu:", error.message);
    } else {
        revalidatePath(`/admin/crm/firmalar/${firmaId}`);
    }
}

// -- SAYFA İÇİ YARDIMCI BİLEŞENLER --

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | null | undefined }) => (
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0 text-accent pt-1">{icon}</div>
        <div>
            <p className="text-sm font-bold text-text-main/60">{label}</p>
            <p className="text-base text-primary font-medium">{value || '-'}</p>
        </div>
    </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
        <h2 className="font-serif text-2xl font-bold text-red-700">Bir Sorun Oluştu</h2>
        <p className="mt-2 text-red-600">{message}</p>
        <Link href="/admin/crm/firmalar" className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors">
            <FiArrowLeft /> Firma Listesine Geri Dön
        </Link>
    </div>
);

const AktiviteEkleFormu = ({ firmaId }: { firmaId: string }) => {
    const etkinlikTurleri: EtkinlikTuru[] = ['Telefon Görüşmesi', 'Müşteri Ziyareti', 'E-posta', 'Diğer'];
    return (
        <form action={aktiviteEkleAction} className="bg-bg-subtle p-4 rounded-lg">
            <input type="hidden" name="firmaId" value={firmaId} />
            <div className="space-y-4">
                <textarea
                    name="ozet"
                    rows={3}
                    required
                    className="w-full bg-white border border-gray-300 rounded-md p-3 text-sm text-text-main focus:ring-2 focus:ring-accent focus:border-transparent transition-colors placeholder:text-text-main/50"
                    placeholder="Görüşme notlarınızı veya etkinliği buraya ekleyin..."
                />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <select name="tur" required className="w-full sm:w-auto bg-white border border-gray-300 rounded-md p-2 text-sm text-text-main focus:ring-2 focus:ring-accent focus:border-transparent">
                        {etkinlikTurleri.map(tur => <option key={tur} value={tur}>{tur}</option>)}
                    </select>
                    <button type="submit" className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm">
                        <FiPlus /> Not Ekle
                    </button>
                </div>
            </div>
        </form>
    );
};

const etkinlikIkonlari: Record<EtkinlikTuru, React.ReactNode> = {
    'Telefon Görüşmesi': <FiPhoneCall />, 'Müşteri Ziyareti': <FiUsers />,
    'E-posta': <FiMailIcon />, 'Durum Değişikliği': <FiTrendingUp />, 'Diğer': <FiMessageSquare />,
};

const ZamanTuneliItem = ({ etkinlik }: { etkinlik: Etkinlik }) => (
    <li className="flex gap-4">
        <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-10 h-10 bg-bg-subtle text-accent rounded-full">{etkinlikIkonlari[etkinlik.tur] || <FiMoreHorizontal />}</div>
            <div className="flex-1 w-px bg-gray-200 mt-2"></div>
        </div>
        <div className="pb-8 flex-1">
            <p className="text-sm text-text-main/60">
                <span className="font-bold text-primary">{etkinlik.profiller?.tam_ad || 'Sistem'}</span> tarafından
                <span className="ml-1">{new Date(etkinlik.created_at).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })} tarihinde eklendi</span>
            </p>
            <p className="mt-2 text-primary bg-white border border-gray-200 p-4 rounded-md whitespace-pre-wrap">{etkinlik.ozet}</p>
        </div>
    </li>
);

// ANA SAYFA BİLEŞENİ
export default async function FirmaDetayPage({ params }: { params: { firmaId: string } }) {
    
    const supabase = createSupabaseServerClient();
    const { firmaId } = params;

    const [firmaRes, finansalRes, userRes, etkinliklerRes] = await Promise.all([
        supabase.from('firmalar').select('*').eq('id', firmaId).single(),
        supabase.from('firmalar_finansal').select('*').eq('firma_id', firmaId).single(),
        supabase.auth.getUser(),
        supabase.from('etkinlikler').select('*, profiller(tam_ad)').eq('firma_id', firmaId).order('created_at', { ascending: false }),
    ]);

    let userRole: UserRole | null = null;
    if (userRes.data.user) {
        const { data: profile } = await supabase.from('profiller').select('rol').eq('id', userRes.data.user.id).single();
        userRole = profile?.rol ?? null;
    }

    const firma: Firma | null = firmaRes.data;
    const finansal: Finansal | null = finansalRes.data;
    const etkinlikler: Etkinlik[] = etkinliklerRes.data || [];

    if (firmaRes.error || !firma) {
        console.error("Firma çekme hatası:", firmaRes.error?.message);
        return <ErrorMessage message="Firma bulunamadı veya bu firmayı görmeye yetkiniz yok." />;
    }

    return (
        <div className="space-y-8">
            <header>
                <Link href="/admin/crm/firmalar" className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors mb-4">
                    <FiArrowLeft />
                    Tüm Firmalara Geri Dön
                </Link>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="font-serif text-4xl font-bold text-primary">{firma.unvan}</h1>
                        <p className="text-text-main/80 mt-1">{firma.kategori}</p>
                    </div>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                        <FiEdit size={16} />
                        Firmayı Düzenle
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
                        <h2 className="font-serif text-2xl font-bold text-primary border-b border-bg-subtle pb-4 mb-6">Firma Kimliği</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                            <InfoItem icon={<FiMapPin size={22} />} label="Adres" value={firma.adres} />
                            <InfoItem icon={<FiPhone size={22} />} label="Telefon" value={firma.telefon} />
                            <InfoItem icon={<FiMail size={22} />} label="E-posta" value={firma.email} />
                            <InfoItem icon={<FiFileText size={22} />} label="Vergi Numarası" value={firma.vergi_no} />
                        </div>
                    </div>

                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
                        <h2 className="font-serif text-2xl font-bold text-primary border-b border-bg-subtle pb-4 mb-6">Etkinlik Zaman Tüneli</h2>
                        <div className="space-y-6">
                            <AktiviteEkleFormu firmaId={firmaId} />
                            {etkinlikler.length > 0 ? (
                                <ul className="pt-6">
                                    {etkinlikler.map(etkinlik => <ZamanTuneliItem key={etkinlik.id} etkinlik={etkinlik} />)}
                                </ul>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-text-main/70">Bu firma için henüz bir etkinlik kaydedilmemiş.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="font-serif text-xl font-bold text-primary mb-4">Satış Süreci</h3>
                        <div className="bg-bg-subtle p-4 rounded-lg text-center">
                            <p className="text-sm font-bold text-text-main/60 uppercase tracking-wider">Mevcut Durum</p>
                            <p className="text-2xl font-bold text-accent mt-1">{firma.status}</p>
                        </div>
                    </div>

                    {userRole === 'Yönetici' && (
                        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-accent/50">
                            <h3 className="font-serif text-xl font-bold text-primary mb-4">Finansal Ayarlar</h3>
                            {finansal ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <FiPercent size={20} className="text-accent" />
                                        <div>
                                            <p className="text-sm font-bold text-text-main/60">Özel İndirim Oranı</p>
                                            <p className="text-lg font-bold text-primary">{finansal.ozel_indirim_orani}%</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <FiCalendar size={20} className="text-accent" />
                                        <div>
                                            <p className="text-sm font-bold text-text-main/60">Ödeme Vadesi</p>
                                            <p className="text-lg font-bold text-primary">{finansal.odeme_vadesi_gun} gün</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-text-main/70">Bu firma için finansal ayar bulunamadı.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}