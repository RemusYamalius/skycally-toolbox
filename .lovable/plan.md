## PageSpeed Insights — تشخيص وحلول

### النتائج
- **Mobile**: Performance 75 · FCP 3.9s · LCP 4.4s · Speed Index 3.9s
- **Desktop**: Performance 97 (ممتاز، لا تغييرات ضرورية)
- Accessibility 94 · Best Practices 100 · SEO 100

المشاكل الحقيقية تخص الموبايل فقط.

### المشاكل المكتشفة من التقارير

1. **Render-blocking CSS (~50ms + سلسلة حرجة 1.27s)**
   `styles.css` (26 KB) و `main.css` (1.5 KB) يُحمَّلان بشكل متسلسل ويحجبان أول رسم للصفحة. هذا هو السبب الرئيسي لـ LCP=4.4s على الموبايل.

2. **Use efficient cache lifetimes (توفير 25 KiB)**
   - `/logo.webp`: PSI يقرأ Cache-Control = None رغم وجود القاعدة في `public/_headers`. القاعدة صحيحة لكن يبدو أنها لا تُطبَّق على ملفات الجذر (`public/*`) — فقط `/assets/*` تعمل.
   - `~flockjs` (25m) و `productHunt` badge (4h / 1d) — طرف ثالث، لا نتحكم بأعمارها.

3. **Improve image delivery (~9 KB)**
   `logo.webp` (10 KB) يمكن تصغيره قليلاً بأبعاد أدق.

4. **Network dependency chain**
   HTML → styles.css → main.css. طول المسار الحرج 1268ms على الموبايل.

---

### خطة الإصلاح

**1. إلغاء حجب CSS للعرض الأولي** (المكسب الأكبر ~1.5-2s على LCP للموبايل)

في `src/routes/__root.tsx`: تحويل تحميل الـ stylesheet الرئيسي (`appCss`) إلى تحميل غير حاجب باستخدام حيلة `media="print"` + `onload="this.media='all'"`، مع إبقاء الـ inline critical CSS الحالي في `RootShell` كما هو حتى لا يظهر flash of unstyled content.

```tsx
// بدل: { rel: "stylesheet", href: appCss }
// نستخدم:
{ rel: "preload", as: "style", href: appCss },
// ونضيف سكربت صغير مثل الذي يحمّل الخطوط، يقلب media إلى 'all' بعد التحميل
// مع <noscript><link rel="stylesheet" href={appCss} /></noscript> للاحتياط
```

هذا يزيل الحاجب الرئيسي دون أي تغيير بصري.

**2. توسيع critical CSS المضمَّن (inline)**

الـ inline style block الحالي في `RootShell` صغير جداً. سأضيف إليه القواعد الأساسية للـ hero + header فقط (bg-hero gradient, layout dimensions, نص العنوان) لضمان LCP نظيف قبل وصول الـ CSS الرئيسي. ~1-2 KB إضافية inline فقط.

**3. تصحيح رؤوس الكاش لملفات الجذر**

تعديل `public/_headers` ليشمل قواعد صريحة لكل ملف ثابت في الجذر:
```
/logo.webp        → immutable 1y
/favicon.png      → immutable 1y
/apple-touch-icon.png → immutable 1y
/robots.txt       → max-age=3600
/sitemap.xml      → max-age=3600
```
مع التحقق من أن Lovable/Cloudflare يطبّق `_headers` على مسارات الجذر (سنعرف من فحص PSI التالي بعد النشر).

**4. لا نغيّر ما هو خارج نطاقنا**
- `~flockjs` هو سكربت Lovable analytics (شارة الموقع). لا تعديل.
- Product Hunt badge — طرف ثالث.
- الخطوط والـ Google Analytics: مؤجلة بالفعل بشكل صحيح.

---

### ما لن أفعله (وأسبابه)
- **لن أُزيل framer-motion أو أعيد كتابة الصفحة الرئيسية.** المشكلة CSS-blocking وليست JS.
- **لن ألمس Desktop** — 97/100 لا يحتاج شيئاً.
- **لن أُقلّل حجم Tailwind CSS** — 26KB (مضغوط ~7KB) طبيعي ومقبول بمجرد إزالة الحجب.

---

### التحقق بعد التطبيق
بعد النشر، أعد تشغيل PSI. المتوقع:
- Mobile LCP: 4.4s → ~2.5s
- Mobile FCP: 3.9s → ~2.0s
- Mobile Performance: 75 → 90+
- Cache lifetimes: يجب أن تختفي `logo.webp` من قائمة "None"

### الملفات المتغيّرة
- `src/routes/__root.tsx` — تحويل appCss إلى تحميل async + توسيع critical inline CSS
- `public/_headers` — إضافة قواعد كاش لملفات الجذر