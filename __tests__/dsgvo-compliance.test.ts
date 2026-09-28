import { describe, it, expect, vi, beforeEach } from 'vitest';
import { anonymizeCustomerData, exportCustomerData } from '../src/app/actions/dsgvo-actions';

const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const mockDelete = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));

const mockSupabaseAdmin = {
    from: vi.fn((table) => {
        if (table === 'siparisler') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ count: 1, error: null }) // Fake 1 order exists
            };
        }
        if (table === 'firmalar') {
            return {
                update: mockUpdate,
                delete: mockDelete,
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'firma-123', email: 'test@test.com' }, error: null })
            };
        }
        if (table === 'profiller') {
            return {
                update: mockUpdate,
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: { rol: 'Yönetici' }, error: null })
            };
        }
        return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
        };
    })
};

const mockSupabaseServer = {
    auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    },
    from: vi.fn((table) => {
        if (table === 'profiller') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: { rol: 'Yönetici', firma_id: 'admin-firma' }, error: null })
            };
        }
        if (table === 'firmalar') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'firma-123', email: 'test@test.com' }, error: null })
            };
        }
        if (table === 'siparisler') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ data: [{ id: 'order-1' }], error: null })
            };
        }
        return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
        };
    })
};

vi.mock('../src/lib/supabase/service', () => ({
    createSupabaseServiceClient: vi.fn(() => mockSupabaseAdmin)
}));

vi.mock('../src/lib/supabase/server', () => ({
    createSupabaseServerClient: vi.fn(() => mockSupabaseServer)
}));

vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({}))
}));

describe('DSGVO & GoBD Compliance Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Edge Case 1: should Soft Delete / Anonymize instead of Hard Delete when orders exist', async () => {
        // mockSupabaseAdmin returns count: 1 for siparisler
        
        const result = await anonymizeCustomerData('firma-123');
        if (!result.success) console.error('Test 1 error:', result.error);

        expect(result.success).toBe(true);
        expect(result.message).toContain('DSGVO kapsamında tüm kişisel verileri (PII) başarıyla anonimleştirildi');
        
        // Ensure DELETE was NEVER called
        expect(mockDelete).not.toHaveBeenCalled();

        // Ensure UPDATE was called to mask data
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            email: expect.stringMatching(/anonim_.*@deleted\.com/),
            telefon: '***_ANONYMIZED_***'
        }));
    });

    it('Edge Case 1.b: should Hard Delete when NO orders exist', async () => {
        // Change mock to return count 0
        mockSupabaseAdmin.from.mockImplementationOnce((table) => {
            if (table === 'siparisler') {
                return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 0, error: null }) };
            }
            return { update: mockUpdate, delete: mockDelete, select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) } as any;
        });

        const result = await anonymizeCustomerData('firma-456');
        if (!result.success) console.error('Test 1.b error:', result.error);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Firma siparişi bulunmadığından kalıcı olarak silindi');

        // Ensure DELETE WAS called
        expect(mockDelete).toHaveBeenCalled();
    });

    it('Edge Case 2: should export all related customer data properly without exposing others', async () => {
        const result = await exportCustomerData('firma-123');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.firma.id).toBe('firma-123');
        expect(result.data?.siparisler.length).toBeGreaterThan(0);
        expect(result.data?.exportedAt).toBeDefined();
    });

    it('Edge Case 3: should clean up AI chat logs older than 30 days', async () => {
        // Change mock for ai_chat_logs
        const mockLt = vi.fn().mockResolvedValue({ error: null });
        const mockDeleteForLogs = vi.fn().mockReturnValue({ lt: mockLt });
        
        mockSupabaseAdmin.from.mockImplementationOnce((table) => {
            if (table === 'ai_chat_logs') {
                return { delete: mockDeleteForLogs } as any;
            }
            return {} as any;
        });

        const { cleanupOldAiChatLogs } = await import('../src/app/actions/dsgvo-actions');
        const result = await cleanupOldAiChatLogs();

        expect(result.success).toBe(true);
        expect(result.message).toContain('30 günden eski sohbet kayıtları başarıyla silindi');
        
        expect(mockDeleteForLogs).toHaveBeenCalled();
        expect(mockLt).toHaveBeenCalledWith('created_at', expect.any(String));
    });
});
