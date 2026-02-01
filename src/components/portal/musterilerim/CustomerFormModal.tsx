'use client';

import { useState } from 'react';
import { FiX, FiMapPin, FiInstagram, FiFacebook, FiGlobe } from 'react-icons/fi';
import { toast } from 'sonner';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: FormData) => Promise<void>;
    labels: {
        title: string;
        companyName: string;
        phone: string;
        email: string;
        address: string;
        category: string;
        submitButton: string;
        cancelButton: string;
        successMessage: string;
        errorMessage: string;
    };
    categoryOptions: string[];
}

export function CustomerFormModal({
    isOpen,
    onClose,
    onSubmit,
    labels,
    categoryOptions
}: CustomerFormModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const formData = new FormData(e.currentTarget);
            await onSubmit(formData);
            toast.success(labels.successMessage);
            onClose();
            (e.target as HTMLFormElement).reset();
        } catch (error) {
            console.error('Form submission error:', error);
            toast.error(labels.errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputBaseClasses = "w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-gray-400";
    const labelBaseClasses = "block text-sm font-bold text-gray-700 mb-2";

    const tagOptions = [
        "#Vitrin_Boş", "#Mutfak_Yok", "#Yeni_Açılış", "#Türk_Sahibi", 
        "#Düğün_Mekanı", "#Kahve_Odaklı", "#Yüksek_Sirkülasyon", 
        "#Lüks_Mekan", "#Teraslı", "#Self_Service",
        "#Zincir_Marka", "#Kendi_Üretimi", "#Rakip_Sözleşmeli"
    ];

    const kaynakOptions = [
        "Google Maps", "Instagram", "Saha Ziyareti", "Referans", "Web", "Diğer"
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b border-gray-200 z-10">
                    <h2 className="font-serif text-2xl font-bold text-primary">{labels.title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <FiX size={24} className="text-gray-600" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        
                        {/* Company Name */}
                        <div className="md:col-span-2">
                            <label htmlFor="unvan" className={labelBaseClasses}>
                                {labels.companyName} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="unvan"
                                name="unvan"
                                required
                                className={inputBaseClasses}
                                placeholder="Örn: Café Lecker"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="kategori" className={labelBaseClasses}>
                                {labels.category} <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="kategori"
                                name="kategori"
                                required
                                className={inputBaseClasses}
                            >
                                <option value="">-- Kategori Seçin --</option>
                                {categoryOptions.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Source */}
                        <div>
                            <label htmlFor="kaynak" className={labelBaseClasses}>
                                Kaynak
                            </label>
                            <select
                                id="kaynak"
                                name="kaynak"
                                className={inputBaseClasses}
                            >
                                <option value="">-- Nasıl Bulundu? --</option>
                                {kaynakOptions.map(k => (
                                    <option key={k} value={k}>{k}</option>
                                ))}
                            </select>
                        </div>

                        {/* Contact Person */}
                        <div>
                            <label htmlFor="yetkili_kisi" className={labelBaseClasses}>
                                Yetkili Kişi
                            </label>
                            <input
                                type="text"
                                id="yetkili_kisi"
                                name="yetkili_kisi"
                                className={inputBaseClasses}
                                placeholder="Örn: Ahmet Yılmaz"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="telefon" className={labelBaseClasses}>
                                {labels.phone}
                            </label>
                            <input
                                type="tel"
                                id="telefon"
                                name="telefon"
                                className={inputBaseClasses}
                                placeholder="+49 ..."
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className={labelBaseClasses}>
                                {labels.email}
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className={inputBaseClasses}
                                placeholder="iletisim@firma.de"
                            />
                        </div>

                        {/* City */}
                        <div>
                            <label htmlFor="sehir" className={labelBaseClasses}>
                                Şehir
                            </label>
                            <input
                                type="text"
                                id="sehir"
                                name="sehir"
                                className={inputBaseClasses}
                                placeholder="Köln"
                            />
                        </div>

                        {/* District */}
                        <div>
                            <label htmlFor="ilce" className={labelBaseClasses}>
                                İlçe
                            </label>
                            <input
                                type="text"
                                id="ilce"
                                name="ilce"
                                className={inputBaseClasses}
                                placeholder="Mülheim"
                            />
                        </div>

                        {/* Neighborhood */}
                        <div>
                            <label htmlFor="mahalle" className={labelBaseClasses}>
                                Mahalle
                            </label>
                            <input
                                type="text"
                                id="mahalle"
                                name="mahalle"
                                className={inputBaseClasses}
                                placeholder="Keupstraße"
                            />
                        </div>

                        {/* Postal Code */}
                        <div>
                            <label htmlFor="posta_kodu" className={labelBaseClasses}>
                                Posta Kodu
                            </label>
                            <input
                                type="text"
                                id="posta_kodu"
                                name="posta_kodu"
                                className={inputBaseClasses}
                                placeholder="51063"
                            />
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                            <label htmlFor="adres" className={labelBaseClasses}>
                                {labels.address}
                            </label>
                            <textarea
                                id="adres"
                                name="adres"
                                rows={3}
                                className={inputBaseClasses}
                                placeholder="Musterstraße 123..."
                            />
                        </div>

                        {/* Google Maps URL */}
                        <div className="md:col-span-2">
                            <label htmlFor="google_maps_url" className={`${labelBaseClasses} inline-flex items-center gap-2`}>
                                <FiMapPin size={14} /> Google Maps URL
                            </label>
                            <input
                                type="url"
                                id="google_maps_url"
                                name="google_maps_url"
                                className={inputBaseClasses}
                                placeholder="https://maps.app.goo.gl/..."
                            />
                        </div>

                        {/* Tags */}
                        <div className="md:col-span-2">
                            <label className={labelBaseClasses}>Etiketler (Çoklu Seçim)</label>
                            <div className="flex flex-wrap gap-2">
                                {tagOptions.map(tag => (
                                    <label key={tag} className="inline-flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-full cursor-pointer hover:bg-gray-200 transition text-xs">
                                        <input
                                            type="checkbox"
                                            name="etiketler"
                                            value={tag}
                                            className="rounded text-accent focus:ring-accent"
                                        />
                                        <span className="font-medium text-gray-700">{tag}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Social Media & Web */}
                        <div className="md:col-span-2">
                            <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-1">
                                Dijital Varlıklar (Sosyal Medya & Web)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="instagram_url" className={`${labelBaseClasses} inline-flex items-center gap-2`}>
                                        <FiInstagram size={14} /> Instagram
                                    </label>
                                    <input
                                        type="url"
                                        id="instagram_url"
                                        name="instagram_url"
                                        className={inputBaseClasses}
                                        placeholder="https://instagram.com/..."
                                    />
                                </div>
                                <div>
                                    <label htmlFor="facebook_url" className={`${labelBaseClasses} inline-flex items-center gap-2`}>
                                        <FiFacebook size={14} /> Facebook
                                    </label>
                                    <input
                                        type="url"
                                        id="facebook_url"
                                        name="facebook_url"
                                        className={inputBaseClasses}
                                        placeholder="https://facebook.com/..."
                                    />
                                </div>
                                <div>
                                    <label htmlFor="web_url" className={`${labelBaseClasses} inline-flex items-center gap-2`}>
                                        <FiGlobe size={14} /> Website
                                    </label>
                                    <input
                                        type="url"
                                        id="web_url"
                                        name="web_url"
                                        className={inputBaseClasses}
                                        placeholder="https://www.firma.de"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="pt-6 mt-6 border-t border-gray-200 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition-colors"
                            disabled={isSubmitting}
                        >
                            {labels.cancelButton}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Kaydediliyor...' : labels.submitButton}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
