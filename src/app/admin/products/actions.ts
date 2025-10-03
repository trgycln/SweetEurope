"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Tip Tanımlaması: Fonksiyonların alabileceği önceki durum ve döndüreceği sonuç için interface oluşturuldu.
// Bu, "any" hatasını çözer ve kodun okunabilirliğini artırır.
interface SaveProductState {
  success: boolean;
  message: string;
}

// Bu fonksiyon hem ekleme hem de güncelleme yapar
// previousState: Formun önceki durumu için tip SafeAction'dan alınmıştır, geçici olarak unknown olarak tanımlanabilir.
// FormData: Next.js/React standardıdır ve tipi bellidir.
export async function saveProduct(previousState: SaveProductState | unknown, formData: FormData): Promise<SaveProductState> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Gelen veriyi güvenli şekilde string'e dönüştürür.
  const productId = formData.get('id') ? String(formData.get('id')) : null; 

  const productData = {
    // string dönüştürmeleri eklendi
    name_de: String(formData.get('name_de')),
    category_de: String(formData.get('category_de')),
    // Sayısal alanları kontrol et
    price: Number(formData.get('price')),
    stock_quantity: Number(formData.get('stock_quantity')),
    image_url: String(formData.get('current_image_url')),
  };

  let error: { message: string } | null; // Tipini Supabase hata objesine uygun belirttik.

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
    console.error('Ürün kaydedilirken hata oluştu:', error.message);
    return { success: false, message: `Hata: ${error.message}` };
  }

  revalidatePath('/admin/products');
  return { success: true, message: 'Ürün başarıyla kaydedildi.' };
}

// deleteProduct fonksiyonunda "any" hatası yoktu, ancak kodun tip güvenliğini artırdık.
export async function deleteProduct(productId: string | number): Promise<SaveProductState> { // productId tipini string/number yaptık
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    console.error('Ürün silinirken hata oluştu:', error.message);
    return { success: false, message: `Hata: ${error.message}` };
  }

  revalidatePath('/admin/products');
  return { success: true, message: 'Ürün başarıyla silindi.' };
}