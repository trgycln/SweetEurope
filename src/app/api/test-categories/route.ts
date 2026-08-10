import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    
    const { data: ana } = await supabase.from('gider_ana_kategoriler').select('*');
    const { data: alt } = await supabase.from('gider_kalemleri').select('*, gider_ana_kategoriler(ad)');
    
    return NextResponse.json({ ana, alt });
}
