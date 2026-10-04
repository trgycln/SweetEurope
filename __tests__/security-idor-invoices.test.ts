import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../src/app/api/invoices/[siparisId]/proforma-pdf/route';
import { NextRequest } from 'next/server';

// Mock Dependencies
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({})),
}));

vi.mock('../src/lib/lexware/invoices', () => ({
    getLexwareInvoicePdfBuffer: vi.fn().mockResolvedValue({ buffer: new ArrayBuffer(8), filename: 'mock.pdf' })
}));

// Provide a mock for supabase clients
const mockAuthGetUser = vi.fn();
const mockProfileData = vi.fn();
const mockSiparisData = vi.fn();

const mockSupabaseServerClient = {
    auth: {
        getUser: mockAuthGetUser
    },
    from: vi.fn((table) => {
        if (table === 'profiller') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: mockProfileData
            };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
    })
};

const mockSupabaseServiceClient = {
    from: vi.fn((table) => {
        if (table === 'siparisler') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: mockSiparisData
            };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
    })
};

vi.mock('../src/lib/supabase/server', () => ({
    createSupabaseServerClient: vi.fn(() => mockSupabaseServerClient)
}));

vi.mock('../src/lib/supabase/service', () => ({
    createSupabaseServiceClient: vi.fn(() => mockSupabaseServiceClient)
}));

describe('IDOR Security - Invoice API Endpoint', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return 403 Forbidden if Customer A requests Customer B invoice', async () => {
        
        // Mock Session for Customer A (firma_id = 'firma-A')
        mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
        mockProfileData.mockResolvedValue({ data: { id: 'user-a', rol: 'Müşteri', firma_id: 'firma-A' } });

        // Mock Database Record for the Order (belongs to 'firma-B')
        mockSiparisData.mockResolvedValue({ 
            data: { 
                id: 'siparis-B', 
                firma_id: 'firma-B', 
                lexware_invoice_id: 'lex-123', 
                lexware_invoice_no: 'INV-123' 
            }, 
            error: null 
        });

        const req = new NextRequest('http://localhost:3000/api/invoices/siparis-B/pdf');
        // context parameter with Promise as expected by the new route signature
        const context = { params: Promise.resolve({ siparisId: 'siparis-B' }) };

        const response = await GET(req, context);

        expect(response.status).toBe(403);
        const text = await response.text();
        expect(text).toContain('Bu faturayı görüntüleme yetkiniz yok.');
    });

    it('should return 200 OK if Customer requests their OWN invoice', async () => {
        
        // Mock Session for Customer A (firma_id = 'firma-A')
        mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
        mockProfileData.mockResolvedValue({ data: { id: 'user-a', rol: 'Müşteri', firma_id: 'firma-A' } });

        // Mock Database Record for the Order (belongs to 'firma-A')
        mockSiparisData.mockResolvedValue({ 
            data: { 
                id: 'siparis-A', 
                firma_id: 'firma-A', 
                lexware_invoice_id: 'lex-123', 
                lexware_invoice_no: 'INV-123' 
            }, 
            error: null 
        });

        const req = new NextRequest('http://localhost:3000/api/invoices/siparis-A/pdf');
        const context = { params: Promise.resolve({ siparisId: 'siparis-A' }) };

        const response = await GET(req, context);

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('application/pdf');
    });

    it('should return 200 OK if Admin requests ANY invoice', async () => {
        
        // Mock Session for Admin (firma_id = null or irrelevant)
        mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
        mockProfileData.mockResolvedValue({ data: { id: 'admin-1', rol: 'Yönetici', firma_id: null } });

        // Mock Database Record for the Order (belongs to 'firma-B')
        mockSiparisData.mockResolvedValue({ 
            data: { 
                id: 'siparis-B', 
                firma_id: 'firma-B', 
                lexware_invoice_id: 'lex-123', 
                lexware_invoice_no: 'INV-123' 
            }, 
            error: null 
        });

        const req = new NextRequest('http://localhost:3000/api/invoices/siparis-B/pdf');
        const context = { params: Promise.resolve({ siparisId: 'siparis-B' }) };

        const response = await GET(req, context);

        expect(response.status).toBe(200);
    });
});
