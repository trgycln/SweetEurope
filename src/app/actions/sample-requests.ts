'use server';

import { createClient } from '@supabase/supabase-js';

export interface SampleCartItemInput {
  product_id: string;
  quantity?: number;
}

export interface SubmitSampleRequestInput {
  waitlist_id: string;
  items: SampleCartItemInput[];
  note?: string;
}

export interface SubmitSampleRequestResponse {
  success: boolean;
  message: string;
  request_id?: string;
  error?: string;
}

export async function submitSampleRequest(input: SubmitSampleRequestInput): Promise<SubmitSampleRequestResponse> {
  try {
    if (!input.waitlist_id) {
      return { success: false, message: 'Waitlist kaydı eksik', error: 'missing_waitlist_id' };
    }
    if (!input.items || input.items.length === 0) {
      return { success: false, message: 'Sepet boş olamaz', error: 'empty_items' };
    }

    // Use service role key to bypass RLS for anonymous users
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: header, error: insertHeaderErr } = await supabase
      .from('sample_requests')
      .insert({ waitlist_id: input.waitlist_id, note: input.note ?? null, status: 'beklemede' })
      .select()
      .single();

    if (insertHeaderErr) {
      console.error('sample_requests insert error', insertHeaderErr);
      return { success: false, message: 'Talep oluşturulamadı', error: insertHeaderErr.message };
    }

    const rows = input.items.map((it) => ({
      request_id: header.id,
      product_id: it.product_id,
      quantity: it.quantity && it.quantity > 0 ? it.quantity : 1,
    }));

    const { error: insertItemsErr } = await supabase
      .from('sample_request_items')
      .insert(rows);

    if (insertItemsErr) {
      console.error('sample_request_items insert error', insertItemsErr);
      return { success: false, message: 'Kalemler eklenemedi', error: insertItemsErr.message };
    }

    return { success: true, message: 'Numune talebiniz alındı', request_id: header.id };
  } catch (e) {
    console.error('submitSampleRequest exception', e);
    return { success: false, message: 'Beklenmeyen hata', error: e instanceof Error ? e.message : 'unknown' };
  }
}
