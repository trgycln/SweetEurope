import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../src/app/api/admin/create-personel-user/route';
import * as emailLib from '../src/lib/email';
import { createSupabaseServerClient } from '../src/lib/supabase/server';
import { createSupabaseServiceClient } from '../src/lib/supabase/service';
import { NextRequest } from 'next/server';

vi.mock('../src/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('../src/lib/supabase/service', () => ({
  createSupabaseServiceClient: vi.fn(),
}));

vi.mock('../src/lib/email', () => ({
  sendPortalWelcomeEmail: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Portal Authorization Flow', () => {
  let mockSupabaseServer: any;
  let mockSupabaseAdmin: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseServer = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-id' } } }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { rol: 'Yönetici' } }),
    };

    mockSupabaseAdmin = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null }),
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
          generateLink: vi.fn().mockResolvedValue({ data: { properties: { action_link: 'link' } }, error: null }),
        },
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { unvan: 'Test Firma', status: 'ADAY' } }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
    };

    (createSupabaseServerClient as any).mockResolvedValue(mockSupabaseServer);
    (createSupabaseServiceClient as any).mockReturnValue(mockSupabaseAdmin);
  });

  it('rolls back (deletes user) when sendPortalWelcomeEmail fails', async () => {
    (emailLib.sendPortalWelcomeEmail as any).mockRejectedValue(new Error('Resend failed'));

    const req = new NextRequest('http://localhost/api/admin/create-personel-user', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        rol: 'Müşteri',
        firma_id: 'test-firma-id',
        sendInviteEmail: true,
      }),
    });

    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('E-posta gönderilemedi, işlem iptal edildi.');
    expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('new-user-id');
  });
});
