// src/app/api/admin/documents/search/route.ts
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

        // Get search parameters
        const { searchParams } = new URL(request.url);
        const searchTerm = searchParams.get('q') || '';
        const folderId = searchParams.get('folderId') || null;
        const dateFrom = searchParams.get('dateFrom') || null;
        const dateTo = searchParams.get('dateTo') || null;
        const tagsParam = searchParams.get('tags') || null;
        const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()) : null;

        // Use PostgreSQL full-text search if search term is provided
        if (searchTerm) {
            // Prepare the search term for PostgreSQL ts_query
            // Replace spaces with AND operators and escape special characters
            const tsQueryTerm = searchTerm
                .trim()
                .split(/\s+/)
                .filter(word => word.length > 0)
                .map(word => word.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, ''))
                .join(' & ');

            const { data, error } = await supabase
                .rpc('search_documents', {
                    p_owner_id: user.id,
                    p_search_term: tsQueryTerm,
                    p_folder_id: folderId,
                    p_date_from: dateFrom,
                    p_date_to: dateTo,
                    p_tags: tags,
                });

            if (error) {
                console.error('Search error:', error);
                return NextResponse.json({ error: 'Search failed' }, { status: 500 });
            }

            return NextResponse.json({ documents: data || [] });
        }

        // Fallback to regular query with filters (no search term)
        let query = supabase
            .from('documents')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (folderId) {
            query = query.eq('folder_id', folderId);
        }

        if (dateFrom) {
            query = query.gte('document_date', dateFrom);
        }

        if (dateTo) {
            query = query.lte('document_date', dateTo);
        }

        if (tags && tags.length > 0) {
            query = query.overlaps('tags', tags);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Query error:', error);
            return NextResponse.json({ error: 'Query failed' }, { status: 500 });
        }

        return NextResponse.json({ documents: data || [] });
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
