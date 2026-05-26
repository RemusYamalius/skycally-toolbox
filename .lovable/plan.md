## Performance fixes — homepage render path

### Fix 1 — Inline critical CSS (`src/routes/__root.tsx`)

Add a `style` entry at the top of `head().scripts`... actually TanStack uses `links` for stylesheets and doesn't expose an inline `style` slot in `head()`. The cleanest approach: add an inline `<style>` element directly inside `RootShell`'s `<head>`, rendered before `<HeadContent />` so it ships in the SSR HTML ahead of the async-loaded `appCss` stylesheet.

Critical CSS to inline (above-the-fold only):
```css
*,::before,::after{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Inter",sans-serif;background:#0a0f1e;color:#fff}
.bg-hero{background:linear-gradient(135deg,#0a0f1e 0%,#0d1b3e 100%)}
h1{margin:0}
```

Use `<style dangerouslySetInnerHTML={{ __html: "..." }} />` placed in `RootShell`'s `<head>` before `<HeadContent />`. No change to existing `appCss` link.

### Fix 2 — Delay GTM 3s after load (`src/routes/__root.tsx`)

Wrap the existing GTM `scripts[]` body in a `setTimeout(..., 3000)` inside the `load` listener. Only the trigger timing changes; gtag config (`G-WHRM5Z08KR`) is untouched.

```js
window.addEventListener('load',function(){
  setTimeout(function(){
    var s=document.createElement('script');
    s.async=true;
    s.src='https://www.googletagmanager.com/gtag/js?id=G-WHRM5Z08KR';
    document.head.appendChild(s);
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}
    gtag('js',new Date());
    gtag('config','G-WHRM5Z08KR');
  },3000);
});
```

### Fix 3 — Verify lucide-react tree-shaking (no code change)

Verified with ripgrep: zero files use `import * as ... from "lucide-react"`. All imports are already named (`import { X, Y } from "lucide-react"`), which Vite tree-shakes correctly. No action needed; documenting as a confirmation step only.

### Out of scope
No changes to `vite.config.ts`, routing, tool data, business logic, or any component file besides `src/routes/__root.tsx`.

### Files touched
- `src/routes/__root.tsx` (Fixes 1 + 2)
