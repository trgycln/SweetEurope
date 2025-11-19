import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ Firmalar API: User not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 Firmalar API: User ID:', user.id);

    const { data: firmalar, error } = await supabase
      .from('firmalar')
      .select('id, unvan')
      .eq('sahip_id', user.id)
      .order('unvan', { ascending: true });

    if (error) {
      console.error('❌ Firmalar fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Firmalar bulundu:', firmalar?.length || 0);
    console.log('📋 Firmalar listesi:', firmalar);

    return NextResponse.json({ firmalar: firmalar || [] });
  } catch (error: any) {
    console.error('❌ API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
