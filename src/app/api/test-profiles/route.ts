import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data } = await supabase.from('profiller').select('id, tam_ad, rol');
    return NextResponse.json(data);
}
