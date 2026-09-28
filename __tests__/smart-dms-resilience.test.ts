import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as analyzePOST } from '../src/app/api/admin/documents/analyze/route';
import { POST as confirmPOST } from '../src/app/api/admin/documents/confirm/route';
import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { uploadPdfToDrive } from '../src/lib/google-drive/service';

// Mock AI module
vi.mock('ai', () => ({
    generateObject: vi.fn()
}));

// Mock Google Drive Service
vi.mock('../src/lib/google-drive/service', () => ({
    uploadPdfToDrive: vi.fn(),
    createDriveFolderIfNotExists: vi.fn().mockResolvedValue('mock-folder-id')
}));

const mockSupabaseAdmin = {
    from: vi.fn((table) => {
        return {
            insert: vi.fn().mockResolvedValue({ error: null })
        };
    })
};

vi.mock('../src/lib/supabase/service', () => ({
    createSupabaseServiceClient: vi.fn(() => mockSupabaseAdmin)
}));

vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({})),
}));

const mockSupabaseServer = {
    auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    },
    from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'admin-1', rol: 'Yönetici' }, error: null })
    })),
    rpc: vi.fn().mockResolvedValue({ data: 123, error: null })
};

vi.mock('../src/lib/supabase/server', () => ({
    createSupabaseServerClient: vi.fn(() => mockSupabaseServer)
}));

describe('Smart DMS Resilience Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Edge Case 1: should return controlled error message on AI Hallucination/Failure', async () => {
        // Mock Gemini to throw an error (simulating malformed JSON or AI crash)
        (generateObject as any).mockRejectedValueOnce(new Error('Malformed JSON output'));

        const formData = new FormData();
        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
        formData.append('file', file);

        const req = new NextRequest('http://localhost:3000/api/admin/documents/analyze', {
            method: 'POST',
            body: formData
        });

        const res = await analyzePOST(req);
        
        expect(res.status).toBe(500);
        const json = await res.json();
        
        // Assert the expected fallback message
        expect(json.error).toBe('AI Analizi başarısız oldu, lütfen bilgileri manuel giriniz');
    });

    it('Edge Case 2: should rollback and NOT insert to Supabase if Google Drive upload fails', async () => {
        // Mock Drive to throw Quota Exceeded
        (uploadPdfToDrive as any).mockRejectedValueOnce(new Error('Quota Exceeded'));

        const formData = new FormData();
        const file = new File(['dummy content'], 'invoice.pdf', { type: 'application/pdf' });
        formData.append('file', file);
        formData.append('aiData', JSON.stringify({
            evrak_turu: 'Fatura',
            firma_id: 'firma-123'
        }));

        const req = new NextRequest('http://localhost:3000/api/admin/documents/confirm', {
            method: 'POST',
            body: formData
        });

        const res = await confirmPOST(req);
        
        expect(res.status).toBe(500);
        const json = await res.json();

        // Must throw error gracefully
        expect(json.error).toContain('Drive yüklemesi başarısız oldu, işlem iptal edildi');
        
        // Critical: Supabase insert MUST NOT have been called
        expect(mockSupabaseAdmin.from('belgeler').insert).not.toHaveBeenCalled();
    });
});
