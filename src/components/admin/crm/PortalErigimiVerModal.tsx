'use client';

import { useState, useTransition } from 'react';
import {
    FiX, FiUserPlus, FiLoader, FiMail, FiUser, FiCheck,
    FiKey, FiCopy, FiCheckCircle, FiRefreshCw, FiExternalLink, FiShield,
} from 'react-icons/fi';
import { toast } from 'sonner';

interface PortalErigimiVerModalProps {
    firmaId: string;
    firmaUnvan: string;
    firmaEmail: string | null;
    yetkiliKisi: string | null;
    locale: string;
    existingUsers?: Array<{ id: string; tam_ad: string | null; rol: string }>;
    onClose: () => void;
    onSuccess: () => void;
}

interface ResultData {
    email: string;
    tempPassword: string | null;
    actionLink: string | null;
    loginUrl: string;
    message: string;
}

function generateRandomPassword() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `Sweet${num}!`;
}

export function PortalErigimiVerModal({
    firmaId,
    firmaUnvan,
    firmaEmail,
    yetkiliKisi,
    locale,
    existingUsers = [],
    onClose,
    onSuccess,
}: PortalErigimiVerModalProps) {
    const [email, setEmail] = useState(firmaEmail || '');
    const [tamAd, setTamAd] = useState(yetkiliKisi || '');
    const [rol, setRol] = useState<'Müşteri' | 'Alt Bayi'>('Müşteri');
    const [authMethod, setAuthMethod] = useState<'password' | 'invite'>('password');
    const [password, setPassword] = useState(generateRandomPassword());
    const [sendInvite, setSendInvite] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<ResultData | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const handleCopy = (text: string, key: string, label = 'Kopyalandı!') => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        toast.success(label);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleGenerateNewPassword = () => {
        const newPass = generateRandomPassword();
        setPassword(newPass);
        toast.info(`Yeni şifre üretildi: ${newPass}`);
    };

    const getCustomerShareMessage = (data: ResultData) => {
        const passLine = data.tempPassword ? `🔑 Geçici Şifreniz: ${data.tempPassword}\n` : '';
        const linkLine = data.actionLink
            ? `🔗 Şifre Belirleme / Aktivasyon Linki: ${data.actionLink}\n`
            : `🔗 Portal Giriş Linki: ${data.loginUrl}\n`;

        return `Merhaba Sayın ${tamAd || yetkiliKisi || firmaUnvan},\n\nElysonSweets B2B Müşteri Portalı erişiminiz tanımlanmıştır.\n\n📧 Kullanıcı Adı (E-posta): ${data.email}\n${passLine}${linkLine}\nPortala giriş yaparak siparişlerinizi verebilir, özel fiyatlarınızı ve cari özetinizi takip edebilirsiniz.\n\nİyi çalışmalar dileriz,\nElysonSweets Ekibi`;
    };

    const handleSubmit = () => {
        if (!email.trim()) {
            toast.error('E-posta adresi zorunludur.');
            return;
        }

        startTransition(async () => {
            try {
                const res = await fetch('/api/admin/create-personel-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email.trim(),
                        password: authMethod === 'password' ? password.trim() : undefined,
                        tam_ad: tamAd.trim() || null,
                        rol,
                        firma_id: firmaId,
                        sendInviteEmail: sendInvite,
                        locale,
                    }),
                });

                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    toast.error(data?.error || 'Portal erişimi verilemedi.');
                    return;
                }

                setResult({
                    email: data?.email || email.trim(),
                    tempPassword: data?.tempPassword || (authMethod === 'password' ? password.trim() : null),
                    actionLink: data?.actionLink || null,
                    loginUrl: data?.loginUrl || `${window.location.origin}/${locale}/login`,
                    message: data?.message || 'Portal erişimi başarıyla tanımlandı.',
                });

                toast.success(`${firmaUnvan} için portal erişimi hazırlandı!`);
            } catch (err) {
                toast.error('Beklenmeyen bir hata oluştu.');
            }
        });
    };

    const handleFinish = () => {
        onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-2.5 text-slate-800">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-700">
                            <FiUserPlus size={18} />
                        </div>
                        <div>
                            <h2 className="font-bold text-base text-slate-800">Portal Giriş Erişimi</h2>
                            <p className="text-xs text-slate-500 font-medium truncate max-w-[260px]">{firmaUnvan}</p>
                        </div>
                    </div>
                    <button
                        onClick={result ? handleFinish : onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Body */}
                {result ? (
                    <div className="p-6 space-y-5">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 text-emerald-600 mt-0.5">
                                <FiCheck size={20} className="stroke-[3]" />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-950 text-sm">Portal Erişimi Aktif Edildi!</h3>
                                <p className="text-xs text-emerald-800 mt-0.5">
                                    {firmaUnvan} için giriş hesabı oluşturuldu ve firma durumu <strong>MÜŞTERİ</strong> olarak güncellendi.
                                </p>
                            </div>
                        </div>

                        {/* Bilgi Kartları */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                                <span className="font-semibold text-slate-500">Kullanıcı Adı / E-posta:</span>
                                <div className="flex items-center gap-2 font-mono font-bold text-slate-800">
                                    <span>{result.email}</span>
                                    <button
                                        onClick={() => handleCopy(result.email, 'email', 'E-posta kopyalandı')}
                                        className="p-1 hover:text-green-600 transition-colors"
                                        title="Kopyala"
                                    >
                                        {copiedKey === 'email' ? <FiCheck size={13} className="text-green-600" /> : <FiCopy size={13} />}
                                    </button>
                                </div>
                            </div>

                            {result.tempPassword && (
                                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                                    <span className="font-semibold text-slate-500">Belirlenen Şifre:</span>
                                    <div className="flex items-center gap-2 font-mono font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                        <span>{result.tempPassword}</span>
                                        <button
                                            onClick={() => handleCopy(result.tempPassword!, 'pass', 'Şifre kopyalandı')}
                                            className="p-1 hover:text-green-800 transition-colors"
                                            title="Kopyala"
                                        >
                                            {copiedKey === 'pass' ? <FiCheck size={13} className="text-green-600" /> : <FiCopy size={13} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between py-1 text-xs">
                                <span className="font-semibold text-slate-500">Giriş Sayfası:</span>
                                <div className="flex items-center gap-2 font-mono text-slate-700 text-[11px]">
                                    <span className="truncate max-w-[200px]">{result.loginUrl}</span>
                                    <button
                                        onClick={() => handleCopy(result.loginUrl, 'url', 'Giriş URL kopyalandı')}
                                        className="p-1 hover:text-green-600 transition-colors"
                                        title="Kopyala"
                                    >
                                        {copiedKey === 'url' ? <FiCheck size={13} className="text-green-600" /> : <FiCopy size={13} />}
                                    </button>
                                </div>
                            </div>

                            {result.actionLink && (
                                <div className="pt-2 border-t border-slate-200/60">
                                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">Doğrudan Şifre Kurulum / Giriş Linki:</span>
                                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-600">
                                        <span className="truncate max-w-[320px] text-[11px]">{result.actionLink}</span>
                                        <button
                                            onClick={() => handleCopy(result.actionLink!, 'actionLink', 'Aktivasyon linki kopyalandı')}
                                            className="px-2 py-1 bg-green-50 text-green-700 font-bold rounded hover:bg-green-100 transition-colors flex items-center gap-1 text-[11px]"
                                        >
                                            {copiedKey === 'actionLink' ? <FiCheck size={12} /> : <FiCopy size={12} />}
                                            Kopyala
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* WhatsApp / Mesaj Metni Kopyala */}
                        <button
                            onClick={() => handleCopy(getCustomerShareMessage(result), 'msg', 'Mesaj metni panoya kopyalandı!')}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                            {copiedKey === 'msg' ? <FiCheckCircle size={15} /> : <FiCopy size={15} />}
                            Müşteriye Gönderim Metnini Kopyala (WhatsApp / E-posta)
                        </button>

                        <button
                            onClick={handleFinish}
                            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
                        >
                            Tamam ve Kapat
                        </button>
                    </div>
                ) : (
                    <div className="p-6 space-y-4">
                        {/* Mevcut bağlı kullanıcılar varsa bilgi */}
                        {existingUsers.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                                <p className="font-bold mb-1">Bu firmaya bağlı mevcut {existingUsers.length} portal kullanıcısı var:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                                    {existingUsers.map(u => (
                                        <li key={u.id} className="truncate">
                                            {u.tam_ad || 'Kullanıcı'} ({u.rol})
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-[11px] text-blue-600 mt-1">Aşağıdan şifre güncelleyebilir veya yeni yetkili ekleyebilirsiniz.</p>
                            </div>
                        )}

                        {/* E-posta */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <FiMail size={13} className="text-slate-400" />
                                Giriş E-posta Adresi <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="musteri@firma.de"
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-500 outline-none transition-all"
                            />
                        </div>

                        {/* Ad Soyad & Rol */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <FiUser size={13} className="text-slate-400" />
                                    Yetkili Ad Soyad
                                </label>
                                <input
                                    type="text"
                                    value={tamAd}
                                    onChange={e => setTamAd(e.target.value)}
                                    placeholder="Yetkili kişi adı"
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <FiShield size={13} className="text-slate-400" />
                                    Portal Rolü
                                </label>
                                <select
                                    value={rol}
                                    onChange={e => setRol(e.target.value as any)}
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-500 outline-none transition-all bg-white"
                                >
                                    <option value="Müşteri">Müşteri (Standart Portal)</option>
                                    <option value="Alt Bayi">Alt Bayi (Bayi Kokpiti)</option>
                                </select>
                            </div>
                        </div>

                        {/* Giriş Yöntemi Seçimi */}
                        <div className="space-y-2 pt-1">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <FiKey size={13} className="text-slate-400" />
                                Giriş / Şifre Belirleme Yöntemi
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAuthMethod('password')}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        authMethod === 'password'
                                            ? 'border-green-500 bg-green-50/60 ring-2 ring-green-200'
                                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                    }`}
                                >
                                    <p className="text-xs font-bold text-slate-800">Geçici Şifre Belirle</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Şifreyi siz belirlersiniz (Önerilen)</p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAuthMethod('invite')}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        authMethod === 'invite'
                                            ? 'border-green-500 bg-green-50/60 ring-2 ring-green-200'
                                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                    }`}
                                >
                                    <p className="text-xs font-bold text-slate-800">Davet Linki Gönder</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Müşteri kendi şifresini kurar</p>
                                </button>
                            </div>

                            {authMethod === 'password' && (
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700">Geçici Şifre:</span>
                                        <button
                                            type="button"
                                            onClick={handleGenerateNewPassword}
                                            className="text-[11px] text-green-700 hover:text-green-800 font-bold flex items-center gap-1 hover:underline"
                                        >
                                            <FiRefreshCw size={11} />
                                            Rastgele Şifre Üret
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 bg-white focus:ring-2 focus:ring-green-400 focus:border-green-500 outline-none"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        İşlem tamamlandığında şifreyi WhatsApp veya e-posta ile müşteriye iletmeniz için hazır metin verilecektir.
                                    </p>
                                </div>
                            )}

                            {/* Davet E-postası Onayı */}
                            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={sendInvite}
                                    onChange={e => setSendInvite(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 accent-green-600"
                                />
                                <div>
                                    <p className="text-xs font-bold text-slate-700">Aktivasyon / Bilgilendirme e-postası gönder</p>
                                    <p className="text-[10px] text-slate-500">Müşterinin e-posta adresine giriş linki iletilir.</p>
                                </div>
                            </label>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isPending}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isPending || !email.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                            >
                                {isPending ? (
                                    <>
                                        <FiLoader className="animate-spin" size={14} />
                                        İşleniyor...
                                    </>
                                ) : (
                                    <>
                                        <FiUserPlus size={14} />
                                        Portal Erişimi Tanımla
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
