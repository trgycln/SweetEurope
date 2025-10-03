"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function updateOrderStatus(orderId: number, newStatus: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) {
    console.error('Sipariş durumu güncellenirken hata oluştu:', error);
    return { success: false, message: `Hata: ${error.message}` };
  }

  revalidatePath('/admin/orders');
  return { success: true, message: 'Sipariş durumu başarıyla güncellendi.' };
}