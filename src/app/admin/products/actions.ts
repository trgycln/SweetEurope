"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Tip Tanımlaması: Server Action'ların döndürdüğü durum tipi (useFormState ile uyumlu)
export interface SaveProductState {
    success: boolean;
    message: string;
}

// Tip Tanımlaması: Ürün veritabanı yapısı
export interface Product {
    id: number;
    name_de: string;
    description_de: string | null; // Açıklamayı ekledik
    price: number;
    stock_quantity: number;
    is_active: boolean;
    image_url: string | null;
    category_de: string | null;
}

const createAdminClient = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------
// FONKSİYON 1: Tüm Ürünleri Çekme (EKLENDİ)
// ---------------------------------------------
export async function getAllProducts(): Promise<Product[]> {
    const supabaseAdmin = createAdminClient();

    const { data: products, error } = await supabaseAdmin
        .from('products')
        .select('*') 
        .order('name_de', { ascending: true });

    if (error) {
        console.error("Ürünler çekilirken hata:", error);
        return [];
    }
    
    return products as Product[];
}

// ---------------------------------------------
// FONKSİYON 2: Ürün Kaydetme (Ekleme ve Güncelleme)
// ---------------------------------------------
export async function saveProduct(previousState: SaveProductState | unknown, formData: FormData): Promise<SaveProductState> {
    const supabaseAdmin = createAdminClient();

    const productId = formData.get('id') ? Number(formData.get('id')) : null; 
    const imageFile = formData.get('image_file') as File;
    const currentImageUrl = formData.get('current_image_url') as string | null;
    const shouldDeleteImage = formData.get('delete_image') === 'on';
    
    // Temel Ürün Verisi
    const productBaseData: any = {
        name_de: String(formData.get('name_de')),
        description_de: String(formData.get('description_de')), // Description alanı eklendi
        category_de: String(formData.get('category_de')),
        price: Number(formData.get('price')),
        stock_quantity: Number(formData.get('stock_quantity')),
        is_active: formData.get('is_active') === 'on', // Checkbox değeri
    };

    let newImageUrl = currentImageUrl; // Varsayılan olarak mevcut URL

    try {
        // 1. GÖRSEL YÖNETİMİ
        
        // Mevcut görseli silme isteği varsa
        if (shouldDeleteImage && currentImageUrl) {
            const fileName = currentImageUrl.split('/').pop();
            if (fileName) {
                await supabaseAdmin.storage.from('product_images').remove([fileName]);
            }
            newImageUrl = null;
        }

        // Yeni görsel yükleme isteği varsa (Eski görseli otomatik silmiyoruz, yönetimi geliştirilebilir)
        if (imageFile && imageFile.size > 0) {
            const fileName = `${Date.now()}-${imageFile.name.replace(/\s/g, '_')}`;
            
            // Eğer güncelleme yapılıyorsa ve yeni görsel yükleniyorsa, eski görseli sil
            if (productId && newImageUrl && newImageUrl !== currentImageUrl && !shouldDeleteImage) {
                 const oldFileName = currentImageUrl!.split('/').pop();
                 if(oldFileName) await supabaseAdmin.storage.from('product_images').remove([oldFileName]);
            }

            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('product_images') 
                .upload(fileName, imageFile, { upsert: true });

            if (uploadError) throw new Error("Görsel yükleme hatası: " + uploadError.message);

            const { data: urlData } = supabaseAdmin.storage
                .from('product_images')
                .getPublicUrl(uploadData.path);
            
            newImageUrl = urlData.publicUrl;
        }

        // 2. Veritabanı Kaydı
        productBaseData.image_url = newImageUrl;
        
        let error: { message: string } | null;

        if (productId) {
            // ID varsa, güncelle
            const { error: updateError } = await supabaseAdmin
                .from('products')
                .update(productBaseData)
                .eq('id', productId);
            error = updateError;
        } else {
            // ID yoksa, yeni ekle
            const { error: insertError } = await supabaseAdmin
                .from('products')
                .insert(productBaseData);
            error = insertError;
        }

        if (error) {
            // Eğer DB kaydı başarısız olursa, yüklenen görseli geri silmek iyi bir uygulamadır
            if (imageFile && imageFile.size > 0 && newImageUrl) {
                 const fileName = newImageUrl.split('/').pop();
                 if(fileName) await supabaseAdmin.storage.from('product_images').remove([fileName]);
            }
            console.error('Ürün kaydedilirken hata oluştu:', error.message);
            return { success: false, message: `Hata: ${error.message}` };
        }

        revalidatePath('/admin/products');
        return { success: true, message: 'Ürün başarıyla kaydedildi.' };

    } catch (error: any) {
        console.error('Genel İşlem Hatası:', error.message);
        return { success: false, message: `Hata: ${error.message}` };
    }
}

// ---------------------------------------------
// FONKSİYON 3: Ürünü Silme
// ---------------------------------------------
export async function deleteProduct(productId: number): Promise<SaveProductState> { 
    const supabaseAdmin = createAdminClient();

    try {
        // 1. Önce ürün detaylarını çek (Görsel URL'sini almak için)
        const { data: product, error: fetchError } = await supabaseAdmin
            .from('products')
            .select('image_url')
            .eq('id', productId)
            .single();

        if (fetchError) throw new Error("Ürün bulunamadı.");
        
        // 2. Ürünü veritabanından sil
        const { error: deleteError } = await supabaseAdmin
            .from('products')
            .delete()
            .eq('id', productId);

        if (deleteError) throw deleteError;

        // 3. İlişkili görseli Supabase Storage'dan sil
        if (product && product.image_url) {
            const fileName = product.image_url.split('/').pop();
            if (fileName) {
                const { error: storageError } = await supabaseAdmin.storage
                    .from('product_images')
                    .remove([fileName]);
                
                if(storageError) console.warn("Görsel silinirken uyarı: " + storageError.message);
            }
        }

        revalidatePath('/admin/products');
        return { success: true, message: 'Ürün başarıyla silindi.' };
    } catch (error: any) {
        console.error('Ürün silinirken hata oluştu:', error.message);
        return { success: false, message: `Hata: ${error.message}` };
    }
}