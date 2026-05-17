'use client';

import { useState, useTransition } from 'react';
import { FiX, FiUserPlus, FiLoader, FiMail, FiUser, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { toast } from 'sonner';

interface PortalErigimiVerModalProps {
    firmaId: string;
    firmaUnvan: string;
    firmaEmail: string | null;
    yetkiliKisi: string | null;
    locale: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function PortalErigimiVerModal({
    firmaId,
    firmaUnvan,
    firmaEmail,
    yetkiliKisi,
    locale,
    onClose,
    onSuccess,
}: PortalErigimiVerModalProps) {
    const [email, setEmail] = useState(firmaEmail || '');
    const [tamAd, setTamAd] = useState(yetkiliKisi || '');
    const [sendInvite, setSendInvite] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [done, setDone] = useState(false);

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
                        tam_ad: tamAd.trim() || null,
                        rol: 'Müşteri',
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

                // Update firma status to MÜŞTERİ
                await fetch('/api/admin/update-firma-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ firmaId, status: 'MÜŞTERİ' }),
                }).catch(() => {});

                setDone(true);
                toast.success(`${firmaUnvan} için portal erişimi verildi!`);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1500);

            } catch (err) {
                toast.error('Beklenmeyen bir hata oluştu.');
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="flex items-center gap-2 text-slate-800">
                        <FiUserPlus size={18} className="text-green-600" />
                        <h2 className="font-bold text-base">Portal Erişimi Ver</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                        <FiX size={18} />
                    </button>
                </div>

                {done ? (
                    <div className="px-5 py-10 text-center">
                        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiCheck size={28} className="text-green-600" />
                        </div>
                        <p className="font-bold text-slate-800">Portal erişimi verildi!</p>
                        <p className="text-sm text-slate-500 mt-1">{firmaUnvan} artık portala erişebilir.</p>
                    </div>
                ) : (
                    <>
                        {/* Body */}
                        <div className="px-5 py-5 space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                                <p className="text-xs font-semibold text-green-800">{firmaUnvan}</p>
                                <p className="text-xs text-green-600 mt-0.5">
                                    Portal kullanıcısı oluşturulacak ve firma durumu MÜŞTERİ olarak güncellenecek.
                                </p>
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                    <FiMail size={12} className="text-slate-400" />
                                    E-posta <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="musteri@firma.de"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-300 focus:border-green-400 outline-none"
                                />
                            </div>

                            {/* Ad Soyad */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                    <FiUser size={12} className="text-slate-400" />
                                    Ad Soyad <span className="text-slate-400 font-normal">(opsiyonel)</span>
                                </label>
                                <input
                                    type="text"
                                    value={tamAd}
                                    onChange={e => setTamAd(e.target.value)}
                                    placeholder="Yetkili kişi adı"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-300 focus:border-green-400 outline-none"
                                />
                            </div>

                            {/* Davet emaili */}
                            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={sendInvite}
                                    onChange={e => setSendInvite(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 accent-green-600"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Davet e-postası gönder</p>
                                    <p className="text-xs text-slate-400">Müşteri şifresini kendisi belirler</p>
                                </div>
                            </label>

                            {!sendInvite && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                    <FiAlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700">
                                        Davet e-postası gönderilmeyecek. Müşteri şifresi daha sonra
                                        "Şifre Linki" butonu ile gönderilebilir.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-5 py-4 border-t bg-slate-50">
                            <button
                                onClick={onClose}
                                disabled={isPending}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 bg-white"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isPending || !email.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isPending
                                    ? <><FiLoader className="animate-spin" size={14} /> İşleniyor...</>
                                    : <><FiUserPlus size={14} /> Erişim Ver</>
                                }
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
