// src/app/api/admin/documents/folder/[id]/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
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

        const { name, description } = await request.json();

        const { data: folder, error } = await supabase
            .from('document_folders')
            .update({
                name: name || undefined,
                description: description !== undefined ? description : undefined,
            })
            .eq('id', id)
            .eq('owner_id', user.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        return NextResponse.json({ folder });
    } catch (error) {
        console.error('Update folder error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
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

        // Get all documents in folder to delete from storage
        const { data: documents } = await supabase
            .from('documents')
            .select('file_path')
            .eq('folder_id', id);

        if (documents && documents.length > 0) {
            const filePaths = documents.map(d => d.file_path);
            await supabase.storage.from('documents').remove(filePaths);
        }

        // Delete folder
        const { error } = await supabase
            .from('document_folders')
            .delete()
            .eq('id', id)
            .eq('owner_id', user.id);

        if (error) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete folder error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
