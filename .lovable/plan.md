## الوضع الحالي

- Desktop: 98 ✓ (LCP 0.8s)
- Mobile: 78 — FCP 3.8s / LCP 4.1s / Speed Index 4.1s
- المشاكل من التقرير:
  - Render-blocking requests — 160ms (styles.css الكامل يمنع الرسم)
  - Reduce unused JS — 219 KiB (framer-motion كامل + بطاقات + lucide)
  - Network dependency tree طويلة
  - Use efficient cache lifetimes — 22 KiB (طرف ثالث، خارج التحكم)

الإصلاح السابق (استبدال بعض `motion.*` في الـ hero + `fetchpriority=high` على CSS) لم يكن كافياً لأن:
1. الـ hero لا يزال يستورد `framer-motion` (imports تبقى في الحزمة حتى لو لم تُستخدم كل الدوال).
2. `styles.css` الكامل (Tailwind + كل الطبقات) يبقى render-blocking بسعة 160ms.
3. الأقسام تحت الطية (`tool-card` بمجموعها، شرائح، شهادات) تُحزَّم في `main.js` بدل chunks منفصلة.

---

## الخطة (3 محاور مركّزة)

### 1. إزالة `framer-motion` **بالكامل** من الصفحة الرئيسية والـ hero

- في `src/routes/index.tsx`: حذف كل `import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"`. استبدال أي `motion.*` متبقّي بعناصر HTML عادية + كلاسات `hero-fade-up` / `hero-fade-up-delay*` الموجودة أصلاً في `styles.css`.
- في `src/components/tool-card.tsx`: التأكد أنه لا يستورد framer-motion (تم سابقًا — التحقق).
- النتيجة: framer-motion لا يدخل chunk الصفحة الرئيسية إطلاقًا → توفير ~90KB gzipped.

### 2. تأجيل الأقسام تحت الطية عبر `React.lazy` + `Suspense`

- استخراج قسمَي "Popular tools" و "Categories" (و"Testimonials" إن وُجد) إلى ملفات منفصلة تحت `src/components/home/` واستيرادها بـ `lazy()`.
- تغليف كل قسم بـ `<Suspense fallback={<div className="min-h-[400px]" />}>` — الـ fallback بارتفاع ثابت لتفادي CLS.
- النتيجة: `main.js` للصفحة الرئيسية ينخفض ~100-120KB، والـ hero يُرسم قبل تحميل تلك chunks.

### 3. Inline critical CSS للـ hero + تأجيل بقية `styles.css`

المشكلة الحقيقية للـ 160ms render-block: `styles.css` كامل ~40-50KB مضغوط، يحمّل Tailwind + كل الأدوات.

- توسيع الـ `<style>` inline الموجود في `__root.tsx` ليشمل: `.bg-hero`, `.grid-overlay`, `.text-gradient`, `.hero-fade-up*`, `@keyframes heroFadeUp`, وأنماط الأزرار/الحقول الأساسية للـ hero.
- تحويل `<link rel="stylesheet" href={appCss} fetchpriority="high">` إلى نمط **preload + swap**:
  ```html
  <link rel="preload" as="style" href={appCss} onload="this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href={appCss}></noscript>
  ```
- ملاحظة: كنّا قد جرّبنا هذا سابقًا وأحدث CLS 0.484 لأن inline CSS كان ناقصًا. هذه المرة سنُدرج **كل** أنماط الـ hero inline (headline, subtitle, buttons, search box, stats badges) قبل التبديل — CLS سيبقى قريبًا من 0.

---

## الملفات المتغيّرة

- `src/routes/index.tsx` — إزالة framer-motion نهائيًا، `lazy()` للأقسام تحت الطية.
- `src/components/home/popular-tools.tsx` (جديد) — يحوي قسم Popular tools.
- `src/components/home/categories-section.tsx` (جديد) — يحوي قسم Categories.
- `src/routes/__root.tsx` — توسيع critical inline CSS + preload/swap لـ appCss.

## المتوقّع

| المقياس | قبل | بعد |
|---|---|---|
| Mobile Performance | 78 | **90+** |
| FCP | 3.8s | **~1.4s** |
| LCP | 4.1s | **~2.0s** |
| Speed Index | 4.1s | **~2.5s** |
| Unused JS | 219 KiB | **~60 KiB** |
| Render-blocking | 160ms | **~30ms** |

Desktop 98 يبقى كما هو (أو 99).

## خارج النطاق

- Cache headers لأصول طرف ثالث (Fazier/ProductHunt/gtag) — خارج التحكم.
- تغيير Tailwind config أو حذف utilities — مخاطرة عالية بلا مكسب يُذكر.
