// src/app/admin/operasyon/urunler/[urunId]/page.tsx

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database, Enums, Tables } from '@/lib/supabase/database.types';
import { notFound, redirect } from 'next/navigation';
import { UrunDuzenleClient } from '@/components/urun-duzenle-client'; // Bu bileşeni aşağıda oluşturacağız

type UserRole = Enums<'user_role'>;

// Bu ana bileşen bir SUNUCU BİLEŞENİ'dir.
// Görevi: Veriyi ve kullanıcı rolünü güvenli bir şekilde çekip Client Component'e aktarmak.
export default async function UrunDetayPage({ params }: { params: { urunId: string } }) {
    const supabase = createSupabaseServerClient();
    const { urunId } = params;

    // Gerekli verileri eş zamanlı çek
    const [urunRes, userRes] = await Promise.all([
        supabase.from('urunler').select('*').eq('id', urunId).single(),
        supabase.auth.getUser()
    ]);
    
    // Ürün bulunamazsa 404 sayfasına yönlendir
    if (urunRes.error || !urunRes.data) {
        notFound();
    }
    
    // Kullanıcı rolünü al
    let userRole: UserRole | null = null;
    if (userRes.data.user) {
        const { data: profile } = await supabase.from('profiller').select('rol').eq('id', userRes.data.user.id).single();
        userRole = profile?.rol ?? null;
    }

    const urun: Tables<'urunler'> = urunRes.data;
    
    // Veriyi ve rolü, state yönetimi yapacak olan Client Component'e prop olarak geç
    return <UrunDuzenleClient urun={urun} userRole={userRole} />;
}