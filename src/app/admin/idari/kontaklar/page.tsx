// src/app/admin/idari/kontaklar/page.tsx

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { KontaklarClient } from '@/components/kontaklar-client';
import { FiSlash } from 'react-icons/fi';
import { redirect } from 'next/navigation'; // Wichtig: redirect importieren, falls es benötigt wird

export default async function KontaklarPage() {
    // ## KORREKTUR: 'await' wurde hier hinzugefügt ##
    const supabase = await createSupabaseServerClient();

    // Güvenlik: Sayfaya sadece 'Yönetici' erişebilir.
    const { data: { user } } = await supabase.auth.getUser();
    // Wichtig: Wenn kein Benutzer vorhanden ist, sofort umleiten, um Fehler in der nächsten Zeile zu vermeiden.
    if (!user) {
        return redirect('/login');
    }

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
 
    if (profile?.rol !== 'Yönetici') {
        return (
            <div className="p-8 text-center">
                <FiSlash className="mx-auto text-5xl text-red-500 mb-4" />
                <h1 className="font-serif text-2xl text-red-600">Erişim Reddedildi</h1>
                <p className="text-text-main mt-2">Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
            </div>
        );
    }
    
    // Gerekli verileri çek
    const [tedarikcilerRes, kontaklarRes] = await Promise.all([
        supabase.from('tedarikciler').select('*').order('ad'),
        supabase.from('dis_kontaklar').select('*').order('kurum_adi')
    ]);

    return (
        <KontaklarClient
            initialTedarikciler={tedarikcilerRes.data || []}
            initialKontaklar={kontaklarRes.data || []}
        />
    );
}