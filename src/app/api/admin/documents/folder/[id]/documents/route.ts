// src/app/api/admin/documents/folder/[id]/documents/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const supabase = await createSupabaseServerClient(cookieStore);
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get search params
        const search = request.nextUrl.searchParams.get('search') || '';

        let query = supabase
            .from('documents')
            .select('*')
            .eq('folder_id', id)
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (search) {
            query = query.ilike('file_name', `%${search}%`);
        }

        const { data: documents, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ documents });
    } catch (error) {
        console.error('Get documents error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
