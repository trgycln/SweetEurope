// src/app/api/admin/documents/download/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
            .select('*, document_folders(id)')
            .eq('id', documentId)
            .eq('owner_id', user.id)
            .single();

        if (docError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Download from storage
        const { data, error: downloadError } = await supabase.storage
            .from('documents')
            .download(document.file_path);

        if (downloadError) {
            console.error('Download error:', downloadError);
            return NextResponse.json({ error: 'Download failed' }, { status: 500 });
        }

        // Update download count
        await supabase
            .from('documents')
            .update({ downloaded_count: (document.downloaded_count || 0) + 1 })
            .eq('id', documentId);

        // Log activity
        await supabase
            .from('document_activity_log')
            .insert({
                document_id: documentId,
                user_id: user.id,
                action: 'downloaded',
            });

        // Return file with proper headers
        return new NextResponse(data, {
            headers: {
                'Content-Type': document.file_type,
                'Content-Disposition': `attachment; filename="${document.file_name}"`,
            },
        });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
