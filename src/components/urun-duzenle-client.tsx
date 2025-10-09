// src/components/urun-duzenle-client.tsx
'use client';

import React, { useState } from 'react';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { UrunFormu } from './urun-formu';
import { productSchemas } from '@/lib/product-schemas';
import { FiEdit } from 'react-icons/fi';

// ... (DinamikOzellikGoster yardımcı bileşeni burada)

export function UrunDetayClient({ urun, tedarikciler, userRole }: UrunDuzenleClientProps) {
  const [editMode, setEditMode] = useState(false);

  if (editMode) {
    return <UrunFormu urun={urun} tedarikciler={tedarikciler} />;
  }

  return (
    <div className="space-y-8">
        {/* ... (Okuma Modu JSX - Bir önceki cevaptaki gibi) ... */}
    </div>
  );
}