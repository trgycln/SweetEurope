// src/app/api/admin/documents/folders/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = await createSupabaseServerClient(cookieStore);
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: folders, error } = await supabase
            .from('document_folders')
            .select('*')
            .eq('owner_id', user.id)
            .order('category')
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ folders });
    } catch (error) {
        console.error('Get folders error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = await createSupabaseServerClient(cookieStore);
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, category, description } = await request.json();

        if (!name || !category) {
            return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
        }

        const { data: folder, error } = await supabase
            .from('document_folders')
            .insert({
                owner_id: user.id,
                name,
                category,
                description: description || null,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ folder });
    } catch (error) {
        console.error('Create folder error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
