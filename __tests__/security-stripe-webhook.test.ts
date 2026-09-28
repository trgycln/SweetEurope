import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../src/app/api/webhooks/stripe/route';
import { NextRequest } from 'next/server';
import { stripe } from '../src/lib/stripe';

// Mock dependencies
vi.mock('../src/lib/stripe', () => ({
    stripe: {
        webhooks: {
            constructEvent: vi.fn()
        }
    }
}));

const { mockSupabaseAdmin } = vi.hoisted(() => {
    return {
        mockSupabaseAdmin: {
            from: vi.fn(() => ({
                update: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({ error: null })
                }))
            }))
        }
    }
});

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabaseAdmin)
}));

describe('Security - Stripe Webhook Spoofing', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    });

    it('should block requests with missing signature and NOT update database', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            body: JSON.stringify({ type: 'checkout.session.completed', data: { object: { metadata: { order_id: '123' } } } })
        });

        const res = await POST(req);
        
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('Webhook secret or signature missing');

        // Verify DB was NOT updated
        expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
    });

    it('should block requests with invalid signature and NOT update database', async () => {
        
        // Mock stripe to throw an error for invalid signature
        (stripe.webhooks.constructEvent as any).mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            headers: {
                'stripe-signature': 'invalid_signature_here'
            },
            body: JSON.stringify({ type: 'checkout.session.completed', data: { object: { metadata: { order_id: '123' } } } })
        });

        const res = await POST(req);
        
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('Invalid signature');

        // Verify DB was NOT updated
        expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
    });

    it('should process correctly ONLY if signature is valid', async () => {
        
        (stripe.webhooks.constructEvent as any).mockReturnValue({
            type: 'checkout.session.completed', 
            data: { object: { id: 'cs_test', metadata: { order_id: 'valid-order-123', firma_id: 'firma-123' } } }
        });

        const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            headers: {
                'stripe-signature': 'valid_signature'
            },
            body: JSON.stringify({ fake: 'body' })
        });

        const res = await POST(req);
        
        expect(res.status).toBe(200);

        // Verify DB WAS updated
        expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('siparisler');
    });
});
