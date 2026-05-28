---
name: premium-animations
description: Web sitelerine göz alıcı, akıcı ve profesyonel animasyonlar eklemek için kullanılır. Kullanıcı animasyonlu veya kreatif bir arayüz istediğinde bu yeteneği devreye sok.
---

# Premium Animasyon Kuralları

Aşağıdaki görevler istendiğinde bu kurallara harfiyen uy:

## 1. Teknoloji Seçimi
- React projeleri için her zaman `framer-motion` kullan.
- Gelişmiş sayfa geçişleri ve scroll efektleri için `gsap` (GreenSock) kütüphanesini tercih et.

## 2. Animasyon Standartları
- Animasyonların 'ease' değerleri her zaman profesyonel hissettirmeli (Örn: `cubic-bezier(0.25, 1, 0.5, 1)`). Klasik 'linear' veya sert geçişler kullanma.
- Sayfa yüklenirken (initial load) elementler hafifçe aşağıdan yukarıya doğru (`y: [20, 0]`) ve opaklığı artarak (`opacity: [0, 1]`) gelsin.

## 3. Performans Constraints (Kısıtlamalar)
- Animasyonların tarayıcıyı yormaması için `will-change` özelliklerini doğru kullan.
- Gereksiz yere tüm DOM elementlerini anime etme, sadece odak noktalarına odaklan.