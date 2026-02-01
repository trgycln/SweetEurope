// src/app/api/admin/documents/delete/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = await createSupabaseServerClient(cookieStore);
        
        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const documentId = request.nextUrl.searchParams.get('id');
        if (!documentId) {
            return NextResponse.json({ error: 'No document ID provided' }, { status: 400 });
        }

        // Get document and verify ownership
        const { data: document, error: docError } = await supabase
            .from('documents')
            .select('file_path')
            .eq('id', documentId)
            .eq('owner_id', user.id)
            .single();

        if (docError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Delete from storage
        const { error: deleteStorageError } = await supabase.storage
            .from('documents')
            .remove([document.file_path]);

        if (deleteStorageError) {
            console.error('Storage deletion error:', deleteStorageError);
        }

        // Delete from database
        const { error: deleteDbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId)
            .eq('owner_id', user.id);

        if (deleteDbError) {
            return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
        }

        // Log activity
        await supabase
            .from('document_activity_log')
            .insert({
                document_id: documentId,
                user_id: user.id,
                action: 'deleted',
            });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
