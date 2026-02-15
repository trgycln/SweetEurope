# 🔄 KÖLN DİSTRİBÜTÖR - KATEGORİ SİSTEMİ MİGRASYONU

## 📋 Özet

Eski kategori sistemi (Hacim Krallari, Gunluk Nakit Akisi, vb.) yeni sisteme (A, B, C, D) taşınmıştır.

### Kategori Eşlemesi:
```
A (80-100 puan):  HACİM KRALLARI
   ← Hacim Krallari, Hotel & Event, Catering
   
B (60-79 puan):   GÜNLÜK NAKİT AKIŞI
   ← Gunluk Nakit Akisi, Coffee Shop & Eiscafé, Kafe
   
C (40-59 puan):   NİŞ PAZARLAR
   ← Nis Pazarlar, Shisha & Lounge, Casual Dining, Restoran
   
D (1-39 puan):    PERAKENDE & RAF ÜRÜNLERİ
   ← Perakende ve Raf Urunleri, Alt Bayi, Rakip/Üretici
```

---

## 🚀 MİGRASYON ADIMLARI

### **ADIM 1: Veritabanını Yedekle** (ÖNEMLI!)
Supabase Dashboard'a git → Backups → Manual backup oluştur

### **ADIM 2: SQL Migrasyonunu Çalıştır**

#### Seçenek A: Supabase Dashboard (En Basit)
1. Supabase Dashboard'a git
2. "SQL Editor" → "New Query"
3. `supabase-migrations/migrate_old_categories_to_new_system.sql` dosyasını aç
4. Tüm SQL kodunu kopyala ve paste et
5. "Run" butonuna tıkla

#### Seçenek B: Supabase CLI (Otomatik)
```bash
# CLI'yi yükle (eğer yoksa)
npm install -g @supabase/cli

# Proje dizinine git
cd sweetheaven-germany

# Migrasyonu çalıştır
supabase db push
```

#### Seçenek C: SQL Dosyasını Direkt Çalıştır
```bash
# psql ile doğrudan
psql YOUR_DATABASE_URL < supabase-migrations/migrate_old_categories_to_new_system.sql
```

### **ADIM 3: Migrasyonu Doğrula**

Supabase SQL Editor'de bu sorguyu çalıştır:
```sql
SELECT kategori, COUNT(*) as count, AVG(oncelik_puani) as avg_puan
FROM firmalar
GROUP BY kategori
ORDER BY kategori;
```

Beklenen sonuç:
```
kategori | count | avg_puan
---------|-------|----------
A        |  X    |   ~90
B        |  Y    |   ~70
C        |  Z    |   ~50
D        |  W    |   ~20
```

---

## ✋ Geri Alma (Rollback)

Eğer sorun olursa, manual yedeklemeden geri yüklemeyi dene:
1. Supabase Dashboard → Backups
2. Backup seç ve "Restore" tıkla

---

## 📝 NOT: Kod Değişiklikleri

### Değiştirilen Dosyalar:
- ✅ `src/lib/crm/kategoriYonetimi.ts` - Yeni sistem tanımlaması
- ✅ `src/app/.../crm/firmalar/page.tsx` - Firma listesi filtresi
- ✅ `src/app/.../crm/firmalar/[firmaId]/page.tsx` - Firma detay formu
- ✅ `src/app/.../crm/firmalar/[firmaId]/actions.ts` - Puanlama otomasyonu

### Backward Compatibility:
- Eski kategorilerin eşlemesi property olarak tutulur
- Veritabanında artık sadece A, B, C, D kategorileri bulunacak

---

## ⚠️ Dikkati Çeken Noktalar

1. **Puanlama:** Migrasiyon sırasında otomatik puanlar atanır
   - A → 90 puan (var olan düşükse)
   - B → 70 puan
   - C → 50 puan
   - D → 20 puan

2. **Mevcut Puan Korunur:** Eğer var olan puan aralığa uyuyorsa, değişmez

3. **Yeni Firmalar:** Sistem A, B, C, D'den seçim yapar, eski kategorileri göstermez

---

## ✅ Kontrol Listesi

- [ ] Veritabanı yedeği alındı mı?
- [ ] SQL migrasyonu çalıştırıldı mı?
- [ ] Veriler doğru şekilde dönüştürüldü mü?
- [ ] UI'de kategoriler A, B, C, D olarak gösteriliyor mu?
- [ ] Yeni firma oluştururken sadece A, B, C, D seçeneği var mı?

---

## 📞 Sorun Giderme

**Soru:** Migrasiyon başarısız oldu?
**Cevap:** Veritabanı yedeğinden geri yükle ve SQL'i adım adım çalıştır

**Soru:** Eski kategoriler hala gösteriliyor?
**Cevap:** Browser cache'i temizle (Ctrl+Shift+Delete) veya incognito modunda aç

**Soru:** Puanlar hatalı mı?
**Cevap:** SQL'de `UPDATE firmalar SET oncelik_puani = ...` bölümünü kontrol et

---

## 🎉 Başarılı Migrasiyon!

Eski kategori sistemi artık tümüyle yeni A, B, C, D sistemine taşındı! 🚀
