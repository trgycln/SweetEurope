// src/app/api/admin/documents/upload/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        console.log('=== Upload started ===');
        const cookieStore = await cookies();
        const supabase = await createSupabaseServerClient(cookieStore);
        
        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('User check:', user ? `User ID: ${user.id}` : 'No user');
        
        if (userError || !user) {
            console.error('Auth error:', userError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse FormData
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const documentType = formData.get('documentType') as string;
        
        console.log('File:', file?.name, 'Size:', file?.size);
        console.log('Document Type:', documentType);
        const description = formData.get('description') as string;
        const tags = formData.get('tags') as string;
        const documentSubject = formData.get('documentSubject') as string;
        const sender = formData.get('sender') as string;
        const recipient = formData.get('recipient') as string;
        const referenceNumber = formData.get('referenceNumber') as string;
        const documentDate = formData.get('documentDate') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!documentType || (documentType !== 'gelen' && documentType !== 'giden')) {
            return NextResponse.json({ error: 'Invalid document type (must be gelen or giden)' }, { status: 400 });
        }

        // Read file bytes
        const fileBytes = await file.arrayBuffer();
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `documents/${user.id}/${documentType}/${fileName}`;
        
        console.log('Uploading to path:', filePath);

        // Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('documents')
            .upload(filePath, fileBytes, {
                contentType: file.type,
                upsert: false,
            });

        console.log('Storage result:', storageData ? 'Success' : 'Failed', storageError);

        if (storageError) {
            console.error('Storage error:', storageError);
            return NextResponse.json({ 
                error: 'Upload failed: Storage error', 
                details: storageError.message 
            }, { status: 500 });
        }

        // Create database record
        const { data: docData, error: docError } = await supabase
            .from('documents')
            .insert({
                document_type: documentType,
                owner_id: user.id,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                file_path: filePath,
                description: description || null,
                tags: tags ? tags.split(',').map(t => t.trim()) : [],
                document_subject: documentSubject || null,
                sender: sender || null,
                recipient: recipient || null,
                reference_number: referenceNumber || null,
                document_date: documentDate || null,
            })
            .select()
            .single();

        console.log('Database insert:', docData ? 'Success' : 'Failed', docError);

        if (docError) {
            console.error('Database error:', docError);
            return NextResponse.json({ 
                error: 'Database error', 
                details: docError.message,
                hint: docError.hint 
            }, { status: 500 });
        }

        console.log('=== Upload completed successfully ===');
        return NextResponse.json({ success: true, document: docData });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
