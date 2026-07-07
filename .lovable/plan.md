## تشخيص دقيق للموبايل (75)

من الصور الثلاث:

| المقياس | القيمة | الحكم |
|---|---|---|
| Performance | 75 | متوسط |
| FCP | 3.9s | ضعيف |
| LCP | 4.2s | ضعيف |
| CLS | 0.002 | ممتاز ✓ |
| TBT | 30ms | ممتاز ✓ |
| Speed Index | 5.0s | ضعيف |

**المشاكل من قائمة Insights/Diagnostics:**
1. **Reduce unused JavaScript — 241KB** (السبب الأكبر). `main-*.js` ~330KB يحتوي على `framer-motion` كامل + كل بطاقات الأدوات + أيقونات lucide كثيرة، بينما الشاشة الأولى على الموبايل لا تحتاج منها إلا الـ hero.
2. **LCP breakdown + Network dependency tree** — عنصر LCP على الموبايل هو نص الـ hero "The Free Tool for Your Images"، وهو ينتظر تحميل `main.js` + `styles.css` + الخطوط قبل أن يظهر.
3. **Use efficient cache lifetimes — 22 KiB** — أصول طرف ثالث (Product Hunt/Fazier badges, gtag). خارج تحكمنا.
4. **Improve image delivery — 5 KiB** — logo بقي أكبر قليلاً من الحاجة (مقبول، عالجناه سابقًا).
5. **Render-blocking requests** — `styles.css` صغير ولن نلمسه (السبب الأخير في CLS 0.484).
6. **Minify JS — 2 KiB** — قزم، تلقائي.

الديسكتوب 96 مع نفس الكود يؤكد أن المشكلة قدرة معالجة الموبايل مع JS ضخم — الحل هو تقليل JS للشاشة الأولى.

---

## خطة الإصلاح (نطاق مضبوط، بلا مقايضات خطرة)

### 1. تخفيف `framer-motion` من الصفحة الرئيسية — الأثر الأكبر

الـ hero حاليًا يستورد ويستخدم `motion`, `useScroll`, `useTransform`, `AnimatePresence` من `framer-motion` (28 استخدامًا). الحزمة ~90KB gzipped وتُحمَّل قبل رسم الـ LCP.

- **hero (فوق الطية)**: استبدال `motion.h1/motion.p/motion.div` بعناصر HTML عادية مع كلاسات CSS للحركة (`hero-fade-up` الموجودة بالفعل في `styles.css`). الحركة تبقى بصريًا نفسها.
- **الأقسام تحت الطية** (بطاقات الأدوات، الشرائح، الشهادات، إلخ): إبقاء `framer-motion` لكن **lazy-load** عبر `React.lazy` — لن يُحمَّل حتى ينتهي الرسم الأول.
- النتيجة المتوقعة: `main.js` ينخفض ~100KB، LCP ينخفض ~1.5s على الموبايل.

### 2. Preload لعنصر LCP (نص الـ hero)

لا يمكن preload لنص، لكن يمكن ضمان أن CSS + الخط الحرج جاهزان بلا انتظار:
- الخط الرئيسي `Inter` مؤجّل حاليًا — نُبقيه (font-display: swap يجعل النص يظهر بـ system-ui فورًا).
- `fetchpriority="high"` على `<link rel="stylesheet" href={appCss}>` لضمان أن الـ CSS يسبق أي شيء آخر.

### 3. تقسيم أيقونات lucide

`import { Search, Upload, Wand2, Video, ImageIcon, ... } from "lucide-react"` يجلب الشجرة بأكملها في بعض bundlers. سنتحقق من `vite.config.ts` أن `lucide-react` يُشجَّر بشكل صحيح؛ إذا لا، نُبدّل إلى import من `lucide-react/dist/esm/icons/<icon>` للأيقونات الأكثر ثقلاً في الصفحة الرئيسية.

### 4. تأجيل قسم "Popular tools" و "Categories"

استخدام `<Suspense>` + `React.lazy` لعزل هذين القسمين في chunks منفصلة تُحمَّل بعد الرسم الأول للـ hero.

---

## الملفات المتغيّرة
- `src/routes/index.tsx` — استبدال `motion.*` في الـ hero بعناصر HTML + CSS، تأجيل الأقسام السفلية عبر `React.lazy`.
- `src/routes/__root.tsx` — إضافة `fetchpriority="high"` لـ appCss link.
- (اختياري) `vite.config.ts` — التحقق من manualChunks لعزل `framer-motion` في chunk خاص.

## المتوقّع
- Mobile Performance: **75 → 90+**
- LCP: 4.2s → **~2.2s**
- FCP: 3.9s → **~1.5s**
- Unused JS: -100 to -150 KB
- Desktop 96 يبقى كما هو أو يتحسن.

## خارج النطاق
- الكاش على `/logo.webp` (استضافة).
- طرف ثالث (Fazier/ProductHunt/gtag) — مؤجّل بالفعل.
- CSS defer (لن نكرر خطأ CLS السابق).
