'use client';

import { useActionState } from 'react';
import { FiSend } from 'react-icons/fi';
import { yeniEtkinlikEkleAction } from './actions';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Action Result Type (muss mit actions.ts übereinstimmen)
type ActionResult = {
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
};

interface EtkinlikEkleFormProps {
    firmaId: string;
    locale: string;
    etkinlikTipleri: string[];
    dict: {
        typeLabel: string;
        descriptionLabel: string;
        placeholder: string;
        submitButton: string;
        submitting: string;
        successMessage: string;
        errorMessage: string;
        requiredError: string;
    };
}

export default function EtkinlikEkleForm({ firmaId, locale, etkinlikTipleri, dict }: EtkinlikEkleFormProps) {
    // Bind arguments to the action
    const actionWithArgs = yeniEtkinlikEkleAction.bind(null, firmaId, locale);
    
    // useActionState hook
    const [state, formAction, isPending] = useActionState(actionWithArgs, { success: false } as ActionResult);

    // Show toast on state change
    useEffect(() => {
        if (state?.error) {
            toast.error(state.error); // Server error might be technical, maybe use dict.errorMessage? But server error is specific.
        } else if (state?.success && state?.message) {
            toast.success(dict.successMessage);
            // Optional: Form reset logic here if needed, but standard form submission usually clears or we can use a ref to reset
            const form = document.getElementById('etkinlik-form') as HTMLFormElement;
            if (form) form.reset();
        }
    }, [state, dict]);

    return (
        <form id="etkinlik-form" action={formAction} className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            {/* Aktivitätstyp Dropdown */}
            <div>
                <label htmlFor="etkinlik_tipi" className="block text-sm font-bold text-gray-700 mb-1">{dict.typeLabel}</label>
                <select
                    id="etkinlik_tipi"
                    name="etkinlik_tipi"
                    required
                    className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                    {etkinlikTipleri.map(tip => <option key={tip} value={tip}>{tip}</option>)}
                </select>
            </div>
            {/* Beschreibung Textarea */}
            <div>
                <label htmlFor="aciklama" className="block text-sm font-bold text-gray-700 mb-1">{dict.descriptionLabel}</label>
                <textarea
                    id="aciklama"
                    name="aciklama"
                    rows={5}
                    required
                    placeholder={dict.placeholder}
                    className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                />
            </div>
            {/* Senden Button */}
            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm transition disabled:opacity-50"
                >
                    {isPending ? (
                        <>
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                            {dict.submitting}
                        </>
                    ) : (
                        <>
                            <FiSend size={16} /> {dict.submitButton}
                        </>
                    )}
                </button>
            </div>
            {state?.error && (
                <div className="text-red-600 text-sm mt-2 bg-red-50 p-2 rounded border border-red-100">
                    {state.error}
                </div>
            )}
        </form>
    );
}
