import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrCreateLexwareContact } from '../src/lib/lexware/contacts';
import { lexwareFetch, LexwareApiError } from '../src/lib/lexware/client';
import { faturaOlusturAction } from '../src/app/actions/lexware-actions';

vi.mock('../src/lib/lexware/client', () => {
    class LexwareApiError extends Error {
        constructor(public status: number, public statusText: string, public details: any) {
            super(`Lexware API Error`);
        }
    }
    return {
        lexwareFetch: vi.fn(),
        getLexwareApiKey: vi.fn().mockReturnValue('dummy_key'),
        LexwareApiError
    };
});

const mockSupabaseAdmin = {
    auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    },
    from: vi.fn((table) => {
        return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: {
                    id: 'firma-123',
                    unvan: 'Test Firma',
                    vergi_no: 'DEINVALID123',
                    lexware_contact_id: null // To force contact creation
                },
                error: null
            }),
            maybeSingle: vi.fn().mockResolvedValue({ data: { rol: 'Yönetici' }, error: null }),
            update: vi.fn().mockReturnThis() // Mock for the update call
        };
    })
};

vi.mock('../src/lib/supabase/service', () => ({
    createSupabaseServiceClient: vi.fn(() => mockSupabaseAdmin)
}));

vi.mock('../src/lib/supabase/server', () => ({
    createSupabaseServerClient: vi.fn(() => mockSupabaseAdmin)
}));

vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({}))
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}));

describe('Lexware Resilience', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Edge Case 3: should throw error on invalid VAT (Lexware returns 400)', async () => {
        
        // Mock lexwareFetch to throw 400 Bad Request
        (lexwareFetch as any).mockRejectedValueOnce(new LexwareApiError(400, 'Bad Request', { message: 'Invalid VAT Registration ID' }));

        await expect(getOrCreateLexwareContact('firma-123')).rejects.toThrow(LexwareApiError);
    });

    it('faturaOlusturAction should catch LexwareApiError and return structured error to the admin without crashing', async () => {
        // Mock the invoice creation which calls contact creation internally
        // In fact, we can mock createLexwareInvoiceForOrder since we test the action level
        // But since the action already catches errors gracefully:
        
        // Mock lexwareFetch to throw 400 Bad Request
        (lexwareFetch as any).mockRejectedValueOnce(new LexwareApiError(400, 'Bad Request', { message: 'Invalid VAT Registration ID' }));

        const result = await faturaOlusturAction('siparis-123');

        expect(result.success).toBe(false);
        // Action wraps errors and catches them safely
        expect(result.error).toBeDefined();
        // The exact error message string might be different, but it should not crash the node process
    });
});
