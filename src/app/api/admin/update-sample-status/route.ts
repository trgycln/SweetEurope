import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

const ALLOWED_STATUS = ['beklemede','gorusuldu','gonderildi','iptal'] as const;
type StatusType = typeof ALLOWED_STATUS[number];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const requestId = formData.get('request_id')?.toString();
    const status = formData.get('status')?.toString() as StatusType | undefined;
    const cancelReason = formData.get('cancel_reason')?.toString() || null;

    if (!requestId || !status) {
      return NextResponse.json({ success: false, message: 'Eksik veri' }, { status: 400 });
    }
    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ success: false, message: 'Geçersiz durum' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    // If cancellation reason is provided and status is iptal, append to note
    let updatePayload: Record<string, any> = { status };
    if (status === 'iptal' && cancelReason) {
      // Append cancellation reason to existing note (if any)
      const { data: existing, error: fetchErr } = await supabase
        .from('sample_requests')
        .select('note')
        .eq('id', requestId)
        .single();
      if (!fetchErr) {
        const prev = existing?.note ? existing.note + '\n---\nİptal Nedeni: ' + cancelReason : 'İptal Nedeni: ' + cancelReason;
        updatePayload.note = prev;
      } else {
        updatePayload.note = 'İptal Nedeni: ' + cancelReason;
      }
    }

    const { error: updateErr } = await supabase
      .from('sample_requests')
      .update(updatePayload)
      .eq('id', requestId);

    if (updateErr) {
      return NextResponse.json({ success: false, message: 'Durum güncellenemedi', error: updateErr.message }, { status: 500 });
    }

    // Redirect back to admin page (referer) for better UX
    const referer = request.headers.get('referer');
    if (referer) {
      return NextResponse.redirect(referer, { status: 303 });
    }
    return NextResponse.json({ success: true, message: 'Durum güncellendi' });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: 'Beklenmeyen hata', error: e?.message }, { status: 500 });
  }
}
