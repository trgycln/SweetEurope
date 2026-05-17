'use client';

import { useState, useTransition } from 'react';
import { FiX, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import { iptalTalebiGonderAction } from '@/app/actions/siparis-actions';
import { toast } from 'sonner';

interface IptalTalebiModalProps {
    siparisId: string;
    siparisNo: string;
    firmaId: string;
    onClose: () => void;
    onSuccess: () => void;
    locale: string;
}

const IPTAL_SEBEPLERI = [
    { key: 'yanlis_siparis', label: { tr: 'Yanlışlıkla verildi', de: 'Versehentlich bestellt' } },
    { key: 'miktar_hatasi', label: { tr: 'Miktar hatası', de: 'Mengenfehler' } },
    { key: 'urun_degisikligi', label: { tr: 'Ürün değişikliği', de: 'Produktänderung' } },
    { key: 'diger', label: { tr: 'Diğer', de: 'Sonstiges' } },
];

export function IptalTalebiModal({
    siparisId,
    siparisNo,
    firmaId,
    onClose,
    onSuccess,
    locale,
}: IptalTalebiModalProps) {
    const [secilenSebep, setSecilenSebep] = useState('');
    const [ekNot, setEkNot] = useState('');
    const [isPending, startTransition] = useTransition();
    const isDE = locale === 'de';

    const handleGonder = () => {
        if (!secilenSebep) {
            toast.error(isDE ? 'Bitte wählen Sie einen Grund.' : 'Lütfen bir sebep seçin.');
            return;
        }
        const secilenLabel = IPTAL_SEBEPLERI.find(s => s.key === secilenSebep)?.label[isDE ? 'de' : 'tr'] || secilenSebep;
        const tamSebep = ekNot ? `${secilenLabel}: ${ekNot}` : secilenLabel;

        startTransition(async () => {
            const result = await iptalTalebiGonderAction(siparisId, siparisNo, tamSebep, firmaId);
            if (result.success) {
                toast.success(isDE
                    ? 'Stornierungsanfrage wurde gesendet.'
                    : 'İptal talebiniz iletildi.');
                onSuccess();
                onClose();
            } else {
                toast.error(result.error || (isDE ? 'Ein Fehler ist aufgetreten.' : 'Bir hata oluştu.'));
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b">
                    <div className="flex items-center gap-2 text-amber-600">
                        <FiAlertTriangle size={20} />
                        <h2 className="font-bold text-base">
                            {isDE ? 'Stornierungsanfrage' : 'İptal Talebi'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    <p className="text-sm text-gray-500">
                        {isDE
                            ? 'Ihr Stornierungswunsch wird an den Administrator weitergeleitet und nach Prüfung bearbeitet.'
                            : 'İptal talebiniz yöneticiye iletilecek ve incelendikten sonra işleme alınacaktır.'}
                    </p>

                    {/* Sebep seçimi */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                            {isDE ? 'Stornierungsgrund *' : 'İptal Sebebi *'}
                        </label>
                        <div className="space-y-2">
                            {IPTAL_SEBEPLERI.map(s => (
                                <label
                                    key={s.key}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        secilenSebep === s.key
                                            ? 'border-amber-400 bg-amber-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="sebep"
                                        value={s.key}
                                        checked={secilenSebep === s.key}
                                        onChange={() => setSecilenSebep(s.key)}
                                        className="accent-amber-500"
                                    />
                                    <span className="text-sm">
                                        {s.label[isDE ? 'de' : 'tr']}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Ek not */}
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">
                            {isDE ? 'Zusätzliche Anmerkung' : 'Ek Açıklama'}
                            <span className="font-normal text-gray-400 ml-1">
                                ({isDE ? 'optional' : 'isteğe bağlı'})
                            </span>
                        </label>
                        <textarea
                            value={ekNot}
                            onChange={e => setEkNot(e.target.value)}
                            rows={3}
                            placeholder={isDE ? 'Weitere Details...' : 'Ek detaylar...'}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-5 border-t">
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        {isDE ? 'Abbrechen' : 'Vazgeç'}
                    </button>
                    <button
                        onClick={handleGonder}
                        disabled={isPending || !secilenSebep}
                        className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isPending
                            ? <><FiLoader className="animate-spin" size={14} /> {isDE ? 'Wird gesendet...' : 'Gönderiliyor...'}</>
                            : (isDE ? 'Anfrage senden' : 'Talebi Gönder')
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
