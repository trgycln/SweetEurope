import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitWaitlistForm } from '@/app/actions/waitlist';
import { checkRateLimit } from '@/lib/rate-limit';

// Next.js headers mock
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('192.168.1.100')
  })
}));

// Supabase mock
const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null });
const mockSelect = vi.fn().mockReturnValue({ single: mockInsert });
const mockFrom = vi.fn().mockReturnValue({ insert: mockSelect, update: mockSelect });

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom
  }))
}));

describe('Anti-Spam & Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate limiter manually if possible, but since it's an in-memory map, 
    // it will carry over unless we mock it. But we actually WANT to test the real rate limit map.
  });

  it('should silently ignore honeypot fields', async () => {
    const formData = {
      firma_adi: 'Spam Inc',
      yetkili_kisi: 'Bot',
      email: 'spam@bot.com',
      bot_field: 'I am a bot'
    };

    const response = await submitWaitlistForm(formData);

    // It should return success to fool the bot
    expect(response.success).toBe(true);
    // But it should NOT call the database
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should block excessive requests (Rate Limiting)', async () => {
    const formData = {
      firma_adi: 'Legit Inc',
      yetkili_kisi: 'User',
      email: 'user@legit.com'
    };

    // Assuming the rate limit is 5 requests per window in `checkRateLimit`
    let lastError: Error | null = null;
    
    // Simulate 10 quick requests
    for (let i = 0; i < 10; i++) {
      try {
        await submitWaitlistForm(formData);
      } catch (err) {
        lastError = err as Error;
      }
    }

    // By the 6th request, it should have thrown a 429 error
    expect(lastError).toBeDefined();
    expect(lastError?.message).toBe('429 Too Many Requests');
  });
});
