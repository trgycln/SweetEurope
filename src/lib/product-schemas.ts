// src/lib/product-schemas.ts

import { Enums } from "./supabase/database.types";

// Formdaki bir alanın yapısını tanımlar.
export type FieldType = "text" | "number" | "textarea";

export interface FieldDefinition {
  id: string; // Veritabanındaki JSON anahtarının adı (key)
  label: string; // Formda görünecek etiket
  type: FieldType;
  placeholder?: string;
  unit?: string; // Örn: 'gr', 'dk', 'ay'
}

// Bir kategoriye ait tüm özel alanları gruplar.
export interface CategorySchema {
  teknikDetaylar: FieldDefinition[];
  kullanimVeSaklama: FieldDefinition[];
}

// ANA KURAL LİSTESİ: Hangi kategoride hangi alanların gösterileceği burada tanımlanır.
// Gelecekte yeni bir kategori (örn: 'Kahveler') eklemek için tek yapman gereken buraya yeni bir giriş eklemek.
export const productSchemas: Record<string, CategorySchema> = {
  "Yaş Pasta": {
    teknikDetaylar: [
      { id: "dilim_sayisi", label: "Dilim Sayısı", type: "number", unit: "dilim" },
      { id: "agirlik_gr", label: "Ağırlık", type: "number", unit: "gr" },
    ],
    kullanimVeSaklama: [
      { id: "saklama_kosullari", label: "Saklama Koşulları", type: "text", placeholder: "Örn: +4°C" },
      { id: "raf_omru_gun", label: "Raf Ömrü", type: "number", unit: "gün" },
    ],
  },
  "Cheesecake": {
    teknikDetaylar: [
        { id: "dilim_sayisi", label: "Dilim Sayısı", type: "number", unit: "dilim" },
        { id: "agirlik_gr", label: "Ağırlık", type: "number", unit: "gr" },
    ],
    kullanimVeSaklama: [
        { id: "saklama_kosullari", label: "Saklama Koşulları", type: "text", placeholder: "Örn: -18°C" },
        { id: "cozunme_suresi_dk", label: "Çözünme Süresi", type: "number", unit: "dk" },
        { id: "raf_omru_gun", label: "Çözündükten Sonra Raf Ömrü", type: "number", unit: "gün" },
    ],
  },
  "Kuru Pasta": {
    teknikDetaylar: [
      { id: "paket_agirligi_gr", label: "Paket Ağırlığı", type: "number", unit: "gr" },
      { id: "adet_pakette", label: "Paketteki Adet", type: "number", unit: "adet" },
    ],
    kullanimVeSaklama: [
      { id: "saklama_kosullari", label: "Saklama Koşulları", type: "text", placeholder: "Serin ve kuru yer" },
      { id: "raf_omru_ay", label: "Raf Ömrü", type: "number", unit: "ay" },
    ],
  },
};

// Formda kullanılacak ana kategori seçeneklerini merkezi bir yerden alıyoruz.
export const anaKategoriOptions: (string & {})[] = [
    "Yaş Pasta", "Cheesecake", "Kuru Pasta", "Muffin", "Kek", "Sütlü Tatlı", "Tuzlular", "Cookie"
];