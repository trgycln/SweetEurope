import { describe, it, expect, vi, beforeEach } from 'vitest';
import { iptalSiparisAction } from '@/app/actions/siparis-actions';
import * as lexwareInvoices from '@/lib/lexware/invoices';

// Mock dependencies
const mockRpc = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    from: (table: string) => ({
      select: mockSelect,
      update: mockUpdate,
    }),
    rpc: mockRpc,
  })
}));

vi.mock('@/lib/supabase/service', () => ({
    createSupabaseServiceClient: () => ({
        rpc: mockRpc,
        from: (table: string) => ({
            select: mockSelect,
            update: mockUpdate,
        })
    })
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({})
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

vi.mock('@/lib/notificationUtils', () => ({
  sendNotification: vi.fn()
}));

// Setup mock chains
mockSelect.mockReturnValue({ eq: mockEq, in: mockEq });
mockEq.mockReturnValue({ single: mockSingle, in: mockEq });

describe('Order Cancellation Idempotency & Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prevent double cancellation and only restore stock once (Idempotency)', async () => {
    let callCount = 0;
    let siparisDurumu = 'Beklemede';
    
    mockUpdate.mockImplementation(() => {
        siparisDurumu = 'İptal Edildi';
        return { eq: vi.fn().mockReturnValue({ error: null }) };
    });

    mockSingle.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { data: { firma_id: 'firma-1' } }; // Profile 1
        if (callCount === 2) return { data: { id: 'order-1', firma_id: 'firma-1', siparis_durumu: 'Beklemede' } }; // Siparis 1
        if (callCount === 3) return { data: { firma_id: 'firma-1' } }; // Profile 2
        if (callCount === 4) return { data: { id: 'order-1', firma_id: 'firma-1', siparis_durumu: siparisDurumu } }; // Siparis 2
        return { data: {} };
    });

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

    const formData = new FormData();
    formData.append('siparisId', 'order-1');

    const spyCancelInvoice = vi.spyOn(lexwareInvoices, 'cancelLexwareInvoiceForOrder').mockResolvedValue({ creditNoteId: 'test' } as any);

    const result1 = await iptalSiparisAction(formData);
    const result2 = await iptalSiparisAction(formData);
    const results = [result1, result2];

    expect(results.some(r => r.message === 'Bestellung erfolgreich storniert.')).toBe(true);
    expect(results.some(r => r.message === 'Zaten iptal edildi')).toBe(true);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('restore_order_stock', { p_siparis_id: 'order-1' });

    expect(spyCancelInvoice).toHaveBeenCalledTimes(1);
    expect(spyCancelInvoice).toHaveBeenCalledWith('order-1', 'Kundenstornierung');
    
    spyCancelInvoice.mockRestore();
  });
});

describe('Lexware Invoices Idempotency (cancelLexwareInvoiceForOrder)', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('should return skipped: true if order has no lexware_invoice_id', async () => {
        const mockDbSingle = vi.fn().mockResolvedValue({ 
            data: { id: 'order-2', lexware_invoice_id: null } 
        });
        
        vi.doMock('@/lib/supabase/service', () => ({
            createSupabaseServiceClient: () => ({
                from: () => ({ select: () => ({ eq: () => ({ single: mockDbSingle }) }) })
            })
        }));

        const { cancelLexwareInvoiceForOrder } = await import('@/lib/lexware/invoices');
        const result = await cancelLexwareInvoiceForOrder('order-2');
        
        expect(result).toHaveProperty('skipped', true);
    });

    it('should return existing storno details if already cancelled (Idempotent)', async () => {
        const mockDbSingle = vi.fn().mockResolvedValue({ 
            data: { 
                id: 'order-3', 
                lexware_invoice_id: 'inv-123',
                lexware_storno_id: 'storno-456',
                lexware_storno_no: 'ST-001',
                lexware_storno_pdf_url: '/storno.pdf'
            } 
        });
        
        vi.doMock('@/lib/supabase/service', () => ({
            createSupabaseServiceClient: () => ({
                from: () => ({ select: () => ({ eq: () => ({ single: mockDbSingle }) }) })
            })
        }));

        const { cancelLexwareInvoiceForOrder } = await import('@/lib/lexware/invoices');
        const result = await cancelLexwareInvoiceForOrder('order-3');
        
        expect(result).toHaveProperty('skipped', true);
        expect(result.creditNoteId).toBe('storno-456');
    });
});
