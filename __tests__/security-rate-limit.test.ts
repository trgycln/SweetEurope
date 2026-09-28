import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../src/app/api/ai/product-advisor/route';
import { NextRequest } from 'next/server';

// Mock dependencies that we don't want to actually execute
vi.mock('../src/lib/ai/sales-agent', () => ({
    runSalesAgent: vi.fn().mockResolvedValue({ reply: 'Mock AI Response', toolsUsed: [] })
}));

vi.mock('../src/lib/supabase/service', () => ({
    createSupabaseServiceClient: vi.fn(() => ({
        from: vi.fn(() => ({
            insert: vi.fn().mockResolvedValue({ error: null })
        }))
    }))
}));

describe('Security - AI API Rate Limiting', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should allow up to 3 requests and block the 4th with 429 Too Many Requests', async () => {
        
        const createRequest = () => {
            return new NextRequest('http://localhost:3000/api/ai/product-advisor', {
                method: 'POST',
                headers: {
                    'x-forwarded-for': '192.168.1.5' // Same IP
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: 'Hello' }]
                })
            });
        };

        // Fire 3 allowed requests
        for (let i = 0; i < 3; i++) {
            const req = createRequest();
            const res = await POST(req);
            expect(res.status).toBe(200);
        }

        // 4th request MUST be blocked by rate limit
        const blockedReq = createRequest();
        const blockedRes = await POST(blockedReq);

        expect(blockedRes.status).toBe(429);
        
        const json = await blockedRes.json();
        expect(json.error).toBe('Too Many Requests');
    });

});
