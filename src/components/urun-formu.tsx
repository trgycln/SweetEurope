// src/components/urun-formu.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import { anaKategoriOptions, productSchemas, FieldDefinition } from '@/lib/product-schemas';
import { yeniUrunEkleAction, urunGuncelleAction } from '@/app/actions/urun-actions';
import Link from 'next/link';
import { FiSave, FiPackage, FiDollarSign, FiImage, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';

type Urun = Tables<'urunler'>;
type Tedarikci = Pick<Tables<'tedarikciler'>, 'id' | 'ad'>;
type UrunFormuProps = { urun?: Urun; tedarikciler: Tedarikci[]; };

const inputBaseClasses = "w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm text-text-main focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-text-main/50";

const DynamicField = ({ field, defaultValue }: { field: FieldDefinition, defaultValue: any }) => {
    // ... (Bir önceki cevaptaki kodun aynısı)
};

export function UrunFormu({ urun, tedarikciler }: UrunFormuProps) {
    const [selectedCategory, setSelectedCategory] = useState(urun?.ana_kategori || '');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const isEditMode = !!urun;
    const schema = productSchemas[selectedCategory] || null;
    
    const formAction = async (formData: FormData) => {
        setError(null);
        startTransition(async () => {
            const result = isEditMode ? await urunGuncelleAction(urun.id, formData) : await yeniUrunEkleAction(formData);
            if (result?.error) setError(result.error);
        });
    };

    return (
        <div className="space-y-8">
            {/* ... (Header - Bir önceki cevaptaki kodun aynısı) ... */}
            <form action={formAction} className="space-y-10">
                {/* ... (Fieldset'ler - Bir önceki cevaptaki kodun aynısı, tüm inputlar dahil) ... */}
            </form>
        </div>
    );
}