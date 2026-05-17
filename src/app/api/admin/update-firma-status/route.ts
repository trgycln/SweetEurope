import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
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

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Beklenmeyen hata.' }, { status: 500 });
    }
}
