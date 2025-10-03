"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Bu fonksiyon hem ekleme hem de güncelleme yapar
export async function saveProduct(previousState: any, formData: FormData) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const productId = formData.get('id') as string;

  const productData = {
    name_de: formData.get('name_de') as string,
    category_de: formData.get('category_de') as string,
    price: Number(formData.get('price')),
    stock_quantity: Number(formData.get('stock_quantity')),
    image_url: formData.get('current_image_url') as string, // Mevcut resmi koru
  };

  // Resim yükleme mantığı buraya daha sonra eklenecek

  let error;

  if (productId) {
    // ID varsa, güncelle
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update(productData)
      .eq('id', productId);
    error = updateError;
  } else {
    // ID yoksa, yeni ekle
    const { error: insertError } = await supabaseAdmin
      .from('products')
      .insert(productData);
    error = insertError;
  }

  if (error) {
    console.error('Ürün kaydedilirken hata oluştu:', error);
    return { success: false, message: `Hata: ${error.message}` };
  }

  revalidatePath('/admin/products');
  return { success: true, message: 'Ürün başarıyla kaydedildi.' };
}

export async function deleteProduct(productId: number) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    console.error('Ürün silinirken hata oluştu:', error);
    return { success: false, message: `Hata: ${error.message}` };
  }

  revalidatePath('/admin/products');
  return { success: true, message: 'Ürün başarıyla silindi.' };
}