## Fixes to `blog.how-to-test-internet-speed-online-free.tsx` and assets

### 1. CTA button text not visible (issue #1)
The "Run a free speed test" `<Link>` is rendered inside a `<p>` whose parent prose styles apply `[&_a]:text-primary [&_a]:underline`. That overrides the button's `text-primary-foreground` and adds an underline that visually obscures the label.

**Fix:** Move the CTA out of the `<p>` (use a `<div>` wrapper) and add `no-underline !text-primary-foreground` classes so the prose `[&_a]` rules can't override it.

### 2. Light mode hides text (issue #2)
The article body relies on `text-foreground/90`, which is correct, but a quick audit of the page in light mode is needed. Suspect cause: nothing in the post is hard-coded dark, but the surrounding tool/hero links may use tokens with insufficient contrast. After switching to light mode in the preview I'll patch any element that uses a token reading as near-background (likely the table header `bg-card` text or the CTA aside). I will only adjust classes on this blog page — no theme token changes.

### 3. Broken image under "How to Test Your Speed with Skycally" (issue #3)
The Pinterest URL (`pinterest.com/pin/...`) is an HTML page, not an image, so the `<img>` shows broken. Replace with a real bundled asset — the uploaded screenshot of the Network Speed Test result page — keeping the alt text `"Network Speed Test - Skycally"`.

### 4. Replace main article (hero) image with the uploaded screenshot (issue #4)
Save the user-uploaded image as `src/assets/blog-network-speed-test.png` (overwriting the previously generated illustration). Both the hero thumbnail (via `blog.ts` import) and the inline image from issue #3 will reference this same file, so the hero and the in-article screenshot match.

### Files

1. `src/assets/blog-network-speed-test.png` — overwrite with `user-uploads://image-17.png` (the attached screenshot).
2. `src/routes/blog.how-to-test-internet-speed-online-free.tsx`
   - Replace the broken `<img src="https://www.pinterest.com/...">` with `<img src={networkSpeedTestThumb} ... />` (import added).
   - Refactor the closing CTA: wrap `<Link>` in a `<div className="mt-6">` instead of `<p>`, add `no-underline !text-primary-foreground` to the Link className.
   - Apply any small light-mode contrast fixes discovered during preview verification (scoped to this file).
3. No changes to `blog.ts`, `BlogPostLayout`, or other posts.

### Verification
After edits, open the post in the preview, toggle the theme to light, and confirm: button label visible, all paragraphs/headings readable, both images render, hero matches the uploaded screenshot.
