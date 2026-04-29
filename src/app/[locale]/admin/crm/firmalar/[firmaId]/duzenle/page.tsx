'use client';

// src/app/[locale]/admin/crm/firmalar/[firmaId]/duzenle/page.tsx
// Firma bilgilerini düzenleme sayfası - eski form işlevselliği korunmuştur

import { useState, useEffect, useTransition } from 'react';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { FiSave, FiX, FiLoader, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaGlobe, FaMapMarkedAlt, FaLinkedin } from 'react-icons/fa';
import { updateFirmaAction, deleteFirmaAction } from '../actions';
import { toast } from 'sonner';
import { Locale } from '@/i18n-config';
import AddressAutofill from '@/components/AddressAutofill';
import Link from 'next/link';
import {
    PUANLAMA_ARALIK,
    puanOnerisi,
    ALT_KATEGORILER,
    ANA_KATEGORILER,
} from '@/lib/crm/kategoriYonetimi';

type Firma = any;
type FirmaKategori = 'A' | 'B' | 'C' | 'D';
type FirmaStatus = 'ADAY' | 'TEMAS EDİLDİ' | 'NUMUNE VERİLDİ' | 'MÜŞTERİ' | 'REDDEDİLDİ';

const kategoriOptions: FirmaKategori[] = ['A', 'B', 'C', 'D'];

const kategoriLabels: Record<string, string> = {
    'A': '🔥 A - HACİM KRALLARI (80-100 puan) | Düğün/Otel/Catering/Kantin',
    'B': '💰 B - GÜNLÜK NAKİT AKIŞI (60-79 puan) | Kafeler/Pastaneler',
    'C': '⭐ C - NİŞ PAZARLAR (40-59 puan) | Shisha/Restoran/Oyun Park',
    'D': '📦 D - PERAKENDE & RAF ÜRÜNLERİ (1-39 puan) | Market/Kiosk',
};

const statusOptions: FirmaStatus[] = ['ADAY', 'TEMAS EDİLDİ', 'NUMUNE VERİLDİ', 'MÜŞTERİ', 'REDDEDİLDİ'];

const tagOptions = [
    '#Vitrin_Boş', '#Mutfak_Yok', '#Yeni_Açılış', '#Türk_Sahibi',
    '#Düğün_Mekanı', '#Kahve_Odaklı', '#Yüksek_Sirkülasyon',
    '#Lüks_Mekan', '#Teraslı', '#Self_Service',
    '#Zincir_Marka', '#Kendi_Üretimi', '#Rakip_Sözleşmeli',
];

const kaynakOptions = ['Google Maps', 'Instagram', 'Saha Ziyareti', 'Referans', 'Web', 'Diğer'];

export default function FirmaDuzenlePage() {
    const supabase = createDynamicSupabaseClient(true);
    const params = useParams();
    const router = useRouter();
    const locale = params.locale as Locale;
    const firmaId = params.firmaId as string;

    const [firma, setFirma] = useState<Firma | null>(null);
    const [createdByProfile, setCreatedByProfile] = useState<{ id: string; tam_ad: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [altBayiProfiles, setAltBayiProfiles] = useState<Array<{ id: string; tam_ad: string | null }>>([]);
    const [parentFirmaOptions, setParentFirmaOptions] = useState<Array<{ id: string; unvan: string }>>([]);
    const [branches, setBranches] = useState<Array<{ id: string; unvan: string }>>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const fetchFirma = async () => {
            if (!firmaId) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('firmalar')
                .select('*')
                .eq('id', firmaId)
                .single();

            if (error || !data) {
                toast.error('Firma bulunamadı.');
                router.push(`/${locale}/admin/crm/firmalar`);
            } else {
                setFirma(data);
                if (data.created_by) {
                    const { data: creator } = await supabase
                        .from('profiller')
                        .select('id, tam_ad')
                        .eq('id', data.created_by)
                        .maybeSingle();
                    setCreatedByProfile(creator || null);
                }
            }
            setLoading(false);
        };
        fetchFirma();
    }, [firmaId]);

    useEffect(() => {
        const fetchAltBayiProfiles = async () => {
            const { data } = await supabase
                .from('profiller')
                .select('id, tam_ad')
                .eq('rol', 'Alt Bayi')
                .order('tam_ad');
            setAltBayiProfiles(data || []);
        };
        fetchAltBayiProfiles();
    }, []);

    useEffect(() => {
        if (!firma?.id) return;
        const fetchFirmaNavi = async () => {
            const { data: mainFirmas } = await supabase
                .from('firmalar')
                .select('id, unvan')
                .is('parent_firma_id', null)
                .order('unvan');
            setParentFirmaOptions(mainFirmas || []);

            const { data: branchList } = await supabase
                .from('firmalar')
                .select('id, unvan')
                .eq('parent_firma_id', firma.id)
                .order('unvan');
            setBranches(branchList || []);
        };
        fetchFirmaNavi();
    }, [firma?.id]);

    const handleUpdate = async (formData: FormData) => {
        if (!firma) return;
        startTransition(async () => {
            const result = await updateFirmaAction(firma.id, firma.status as FirmaStatus, formData);
            if (result.error) {
                toast.error(`Kayıt hatası: ${result.error}`);
            } else if (result.success) {
                toast.success('Firma bilgileri kaydedildi.');
                router.push(`/${locale}/admin/crm/firmalar/${firmaId}`);
            } else {
                toast.error('Bilinmeyen hata.');
            }
        });
    };

    if (loading) return (
        <div className="flex justify-center items-center p-10 text-slate-500">
            <FiLoader className="animate-spin text-2xl mr-2" /> Yükleniyor...
        </div>
    );
    if (!firma) return <div className="p-6 text-red-500">Firma yüklenemedi.</div>;

    const inp = 'w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition placeholder:text-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed';

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Page Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {firma.unvan}
                        {(firma as any).oncelik_puani !== undefined && (
                            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
                                (firma as any).oncelik_puani >= 80 ? 'bg-red-500' :
                                (firma as any).oncelik_puani >= 50 ? 'bg-amber-500' : 'bg-slate-400'
                            }`}>
                                Puan: {(firma as any).oncelik_puani}
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">Genel bilgiler ve ayarlar</p>
                    {createdByProfile && (
                        <p className="text-xs text-slate-400 mt-1">
                            Kaydeden: {createdByProfile.tam_ad || createdByProfile.id}
                        </p>
                    )}
                </div>
                <Link
                    href={`/${locale}/admin/crm/firmalar/${firmaId}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
                >
                    <FiArrowLeft size={14} /> Özete Dön
                </Link>
            </div>

            {/* Social Quick Access */}
            {((firma as any).instagram_url || (firma as any).linkedin_url || (firma as any).facebook_url || (firma as any).web_url || (firma as any).google_maps_url) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-500 mb-3">🔗 Hızlı Erişim</p>
                    <div className="flex flex-wrap gap-2">
                        {(firma as any).instagram_url && (
                            <a href={(firma as any).instagram_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-medium hover:opacity-90">
                                <FaInstagram size={13} /> Instagram
                            </a>
                        )}
                        {(firma as any).linkedin_url && (
                            <a href={(firma as any).linkedin_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:opacity-90">
                                <FaLinkedin size={13} /> LinkedIn
                            </a>
                        )}
                        {(firma as any).facebook_url && (
                            <a href={(firma as any).facebook_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-medium hover:opacity-90">
                                <FaFacebook size={13} /> Facebook
                            </a>
                        )}
                        {(firma as any).web_url && (
                            <a href={(firma as any).web_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-medium hover:opacity-90">
                                <FaGlobe size={13} /> Web
                            </a>
                        )}
                        {(firma as any).google_maps_url && (
                            <a href={(firma as any).google_maps_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:opacity-90">
                                <FaMapMarkedAlt size={13} /> Harita
                            </a>
                        )}
                    </div>
                </div>
            )}

            <form action={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

                    {/* Firma Adı */}
                    <div className="md:col-span-2">
                        <label htmlFor="unvan" className="block text-sm font-bold text-slate-700 mb-1.5">Firma Adı *</label>
                        <input type="text" id="unvan" name="unvan" defaultValue={firma.unvan} required className={inp} />
                    </div>

                    {/* Kategori */}
                    <div>
                        <label htmlFor="kategori" className="block text-sm font-bold text-slate-700 mb-1.5">Kategori</label>
                        <select id="kategori" name="kategori" defaultValue={firma.kategori || ''} className={inp}>
                            <option value="">-- Seçin --</option>
                            {kategoriOptions.map(cat => (
                                <option key={cat} value={cat}>{kategoriLabels[cat] || cat}</option>
                            ))}
                        </select>
                        {firma.kategori && ['A', 'B', 'C', 'D'].includes(firma.kategori) && (
                            <div className="mt-2 p-3 bg-purple-50 border-l-4 border-purple-400 rounded-lg">
                                <p className="font-bold text-purple-900 text-xs">{(ANA_KATEGORILER as any)[firma.kategori]}</p>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {((ALT_KATEGORILER as any)[firma.kategori] || []).map((k: string, i: number) => (
                                        <span key={i} className="text-[10px] px-2 py-0.5 bg-white border border-purple-200 text-purple-700 rounded-full">{k}</span>
                                    ))}
                                </div>
                                <p className="text-[10px] text-purple-600 mt-1.5">
                                    Puan aralığı: {(PUANLAMA_ARALIK as any)[firma.kategori]?.min}–{(PUANLAMA_ARALIK as any)[firma.kategori]?.max} · Önerilen: {(PUANLAMA_ARALIK as any)[firma.kategori]?.ort}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Öncelik Puanı */}
                    <div>
                        <label htmlFor="oncelik_puani" className="block text-sm font-bold text-slate-700 mb-1.5">Öncelik Puanı (1–100)</label>
                        <input
                            type="number" id="oncelik_puani" name="oncelik_puani"
                            min="1" max="100"
                            defaultValue={(firma as any).oncelik_puani || ''}
                            className={inp}
                            placeholder="1–100"
                        />
                        {firma.kategori && (
                            <p className="text-[11px] text-slate-400 mt-1">
                                💡 {firma.kategori} kategorisi için önerilen: {(PUANLAMA_ARALIK as any)[firma.kategori]?.ort || 50}
                            </p>
                        )}
                    </div>

                    {/* Status */}
                    <div>
                        <label htmlFor="status" className="block text-sm font-bold text-slate-700 mb-1.5">Statü</label>
                        <select id="status" name="status" defaultValue={firma.status || ''} className={`${inp} font-semibold`}>
                            <option value="" disabled>-- Seçin --</option>
                            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Kaynak */}
                    <div>
                        <label htmlFor="kaynak" className="block text-sm font-bold text-slate-700 mb-1.5">Kaynak</label>
                        <select id="kaynak" name="kaynak" defaultValue={(firma as any).kaynak || ''} className={inp}>
                            <option value="">-- Nasıl bulundu? --</option>
                            {kaynakOptions.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>

                    {/* Yetkili Kişi */}
                    <div>
                        <label htmlFor="yetkili_kisi" className="block text-sm font-bold text-slate-700 mb-1.5">Yetkili / Karar Verici</label>
                        <input type="text" id="yetkili_kisi" name="yetkili_kisi"
                            defaultValue={(firma as any).yetkili_kisi || ''} className={inp}
                            placeholder="Ad Soyad" />
                    </div>

                    {/* E-posta */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-1.5">E-posta</label>
                        <input type="email" id="email" name="email" defaultValue={firma.email || ''} className={inp} />
                    </div>

                    {/* Telefon */}
                    <div>
                        <label htmlFor="telefon" className="block text-sm font-bold text-slate-700 mb-1.5">Telefon</label>
                        <input type="tel" id="telefon" name="telefon" defaultValue={firma.telefon || ''} className={inp} />
                    </div>

                    {/* Adres (AutoFill) */}
                    <div className="md:col-span-2">
                        <AddressAutofill
                            defaultCity={(firma as any).sehir || ''}
                            defaultDistrict={(firma as any).ilce || ''}
                            defaultNeighborhood={(firma as any).mahalle || ''}
                            defaultZipCode={(firma as any).posta_kodu || ''}
                            disabled={false}
                        />
                    </div>

                    {/* Adres */}
                    <div className="md:col-span-2">
                        <label htmlFor="adres" className="block text-sm font-bold text-slate-700 mb-1.5">Adres (Sokak & No)</label>
                        <textarea id="adres" name="adres" rows={2} defaultValue={firma.adres || ''} className={inp} />
                    </div>

                    {/* Ana Firma */}
                    <div className="md:col-span-2">
                        <label htmlFor="parent_firma_id" className="block text-sm font-bold text-slate-700 mb-1.5">
                            🏢 Ana Firma (Bu işletmenin ana firması var mı?)
                        </label>
                        <select
                            id="parent_firma_id" name="parent_firma_id"
                            defaultValue={(firma as any).parent_firma_id || ''}
                            className={inp}
                        >
                            <option value="">-- Hayır, bu ana firma --</option>
                            {parentFirmaOptions.map(f => (
                                <option key={f.id} value={f.id}>{f.unvan}</option>
                            ))}
                        </select>
                        {branches.length > 0 && (
                            <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-xs font-bold text-green-800 mb-1">
                                    ✅ {branches.length} şube bağlı:
                                </p>
                                {branches.map(b => (
                                    <p key={b.id} className="text-xs text-green-700">• {b.unvan}</p>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Alt Bayi Kullanıcısı */}
                    {((firma as any).kategori === 'Alt Bayi' || (firma as any).ticari_tip === 'alt_bayi') && (
                        <div>
                            <label htmlFor="sahip_id" className="block text-sm font-bold text-slate-700 mb-1.5">Alt Bayi Kullanıcısı</label>
                            <select id="sahip_id" name="sahip_id" defaultValue={(firma as any).sahip_id || ''} className={inp}>
                                <option value="">-- Kullanıcı Seçin --</option>
                                {altBayiProfiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.tam_ad || p.id}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Etiketler */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Etiketler</label>
                        <div className="flex flex-wrap gap-2">
                            {tagOptions.map(tag => (
                                <label key={tag} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer transition">
                                    <input
                                        type="checkbox" name="etiketler" value={tag}
                                        defaultChecked={(firma as any).etiketler?.includes(tag)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-medium text-slate-600">{tag}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Son Etkileşim (sadece bilgi) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Son Etkileşim (Otomatik)</label>
                        <input
                            type="text"
                            value={(firma as any).son_etkilesim_tarihi
                                ? new Date((firma as any).son_etkilesim_tarihi).toLocaleDateString('tr-TR')
                                : 'Henüz yok'}
                            disabled
                            className={`${inp} bg-slate-100`}
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Etkinlik eklendiğinde otomatik güncellenir.</p>
                    </div>

                    {/* Referans */}
                    <div className="flex items-center gap-3 md:col-span-2 pt-2">
                        <input
                            id="referans_olarak_goster"
                            name="referans_olarak_goster"
                            type="checkbox"
                            defaultChecked={firma.referans_olarak_goster ?? false}
                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <label htmlFor="referans_olarak_goster" className="text-sm font-medium text-slate-700">
                            Ana sayfada referans olarak göster
                        </label>
                    </div>

                    {/* Sosyal Medya & URL'ler */}
                    <div className="md:col-span-2 pt-2 border-t border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 mb-4">Sosyal Medya & Bağlantılar</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="instagram_url" className="block text-xs font-bold text-slate-500 mb-1">Instagram</label>
                                <input type="url" id="instagram_url" name="instagram_url"
                                    placeholder="https://instagram.com/..."
                                    defaultValue={(firma as any).instagram_url || ''} className={inp} />
                                {(firma as any).parent_firma_id && (
                                    <label className="inline-flex items-center gap-1.5 mt-1 cursor-pointer">
                                        <input type="checkbox" name="inherit_instagram_url"
                                            defaultChecked={(firma as any).inherit_instagram_url}
                                            className="rounded text-blue-600" />
                                        <span className="text-[11px] text-slate-500">Ana firmadan devral</span>
                                    </label>
                                )}
                            </div>
                            <div>
                                <label htmlFor="linkedin_url" className="block text-xs font-bold text-slate-500 mb-1">LinkedIn</label>
                                <input type="url" id="linkedin_url" name="linkedin_url"
                                    placeholder="https://linkedin.com/company/..."
                                    defaultValue={(firma as any).linkedin_url || ''} className={inp} />
                                {(firma as any).parent_firma_id && (
                                    <label className="inline-flex items-center gap-1.5 mt-1 cursor-pointer">
                                        <input type="checkbox" name="inherit_linkedin_url"
                                            defaultChecked={(firma as any).inherit_linkedin_url}
                                            className="rounded text-blue-600" />
                                        <span className="text-[11px] text-slate-500">Ana firmadan devral</span>
                                    </label>
                                )}
                            </div>
                            <div>
                                <label htmlFor="facebook_url" className="block text-xs font-bold text-slate-500 mb-1">Facebook</label>
                                <input type="url" id="facebook_url" name="facebook_url"
                                    placeholder="https://facebook.com/..."
                                    defaultValue={(firma as any).facebook_url || ''} className={inp} />
                                {(firma as any).parent_firma_id && (
                                    <label className="inline-flex items-center gap-1.5 mt-1 cursor-pointer">
                                        <input type="checkbox" name="inherit_facebook_url"
                                            defaultChecked={(firma as any).inherit_facebook_url}
                                            className="rounded text-blue-600" />
                                        <span className="text-[11px] text-slate-500">Ana firmadan devral</span>
                                    </label>
                                )}
                            </div>
                            <div>
                                <label htmlFor="web_url" className="block text-xs font-bold text-slate-500 mb-1">Website</label>
                                <input type="url" id="web_url" name="web_url"
                                    placeholder="https://..."
                                    defaultValue={(firma as any).web_url || ''} className={inp} />
                                {(firma as any).parent_firma_id && (
                                    <label className="inline-flex items-center gap-1.5 mt-1 cursor-pointer">
                                        <input type="checkbox" name="inherit_web_url"
                                            defaultChecked={(firma as any).inherit_web_url}
                                            className="rounded text-blue-600" />
                                        <span className="text-[11px] text-slate-500">Ana firmadan devral</span>
                                    </label>
                                )}
                            </div>
                            <div>
                                <label htmlFor="google_maps_url" className="block text-xs font-bold text-slate-500 mb-1">Google Maps</label>
                                <input type="url" id="google_maps_url" name="google_maps_url"
                                    placeholder="https://maps.google.com/..."
                                    defaultValue={(firma as any).google_maps_url || ''} className={inp} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            if (!window.confirm('Bu firmayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
                            startTransition(async () => {
                                const res = await deleteFirmaAction(firmaId, locale);
                                if (!res.success) {
                                    toast.error(`Silme başarısız: ${res.error || 'Bilinmeyen hata'}`);
                                } else {
                                    toast.success('Firma silindi.');
                                    router.push(`/${locale}/admin/crm/firmalar`);
                                }
                            });
                        }}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                    >
                        <FiTrash2 size={14} /> Firmayı Sil
                    </button>

                    <div className="flex gap-3">
                        <Link
                            href={`/${locale}/admin/crm/firmalar/${firmaId}`}
                            className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition flex items-center gap-1.5"
                        >
                            <FiX size={14} /> İptal
                        </Link>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {isPending ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
                            {isPending ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
