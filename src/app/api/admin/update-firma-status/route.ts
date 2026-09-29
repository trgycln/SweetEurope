import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';

import { verifyCsrfOrigin } from '@/lib/security-utils';

export async function POST(req: Request) {
    // CSRF Koruması
    if (!verifyCsrfOrigin(req)) {
        return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }

    try {
        const { firmaId, status } = await req.json();
        if (!firmaId || !status) {
            return NextResponse.json({ error: 'firmaId ve status zorunludur.' }, { status: 400 });
        }

        const supabase = createSupabaseServiceClient();
        const { error } = await supabase
            .from('firmalar')
            .update({ status })
            .eq('id', firmaId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Yetki İptali / Oturum Düşürme Mantığı:
        // Eğer statü PASİF veya REDDEDİLDİ ise bu firmaya bağlı tüm kullanıcıları banla.
        // Aksi takdirde (ör. MÜŞTERİ yapıldığında) banı kaldır.
        const shouldBan = status === 'PASİF' || status === 'REDDEDİLDİ';
        
        const { data: users } = await supabase
            .from('profiller')
            .select('id')
            .eq('firma_id', firmaId);

        if (users && users.length > 0) {
            for (const user of users) {
                if (shouldBan) {
                    await supabase.auth.admin.updateUserById(user.id, { ban_duration: '876000h' });
                } else {
                    await supabase.auth.admin.updateUserById(user.id, { ban_duration: 'none' });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Update firma status error:', err);
        return NextResponse.json({ error: 'Beklenmeyen hata.' }, { status: 500 });
    }
}
