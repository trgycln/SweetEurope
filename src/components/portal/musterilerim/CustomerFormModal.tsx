'use client';

import { useState } from 'react';
import { FiX } from 'react-icons/fi';
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
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
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="unvan" className="block text-sm font-semibold text-gray-700 mb-2">
                            {labels.companyName} *
                        </label>
                        <input
                            type="text"
                            id="unvan"
                            name="unvan"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder={labels.companyName}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="telefon" className="block text-sm font-semibold text-gray-700 mb-2">
                                {labels.phone}
                            </label>
                            <input
                                type="tel"
                                id="telefon"
                                name="telefon"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder={labels.phone}
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                {labels.email}
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder={labels.email}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="kategori" className="block text-sm font-semibold text-gray-700 mb-2">
                            {labels.category}
                        </label>
                        <select
                            id="kategori"
                            name="kategori"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                            <option value="">-</option>
                            {categoryOptions.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="adres" className="block text-sm font-semibold text-gray-700 mb-2">
                            {labels.address}
                        </label>
                        <textarea
                            id="adres"
                            name="adres"
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder={labels.address}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                        >
                            {labels.cancelButton}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? '...' : labels.submitButton}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
