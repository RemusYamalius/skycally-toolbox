## Plan: Overhaul Privacy Policy and Terms of Service Pages

### What
Replace the lightweight placeholder content on `/privacy` and `/terms` with comprehensive, professional legal copy suitable for an ad-supported website.

### Why
Current pages are only 3–4 sentences each. The new content covers data collection, cookies, third-party services, user obligations, liability, and advertising — all required for a credible tool platform.

### How

1. **Privacy Policy (`src/routes/privacy.tsx`)**
   - Replace the existing `prose`-styled JSX with the full article provided by the user.
   - Use the same explicit Tailwind child selectors that `BlogPostLayout` uses for typography (`[&_h2]`, `[&_h3]`, `[&_p]`, `[&_ul]`, `[&_ol]`, `[&_strong]`, `[&_a]`) instead of `prose` / `prose-sm` / `dark:prose-invert`.
   - Keep `max-w-[720px]`, `mx-auto`, `px-4 sm:px-6`, `py-12`, `text-[16px]`, `leading-[1.8]`.
   - Keep the existing `<h1>` and update the "Last updated" date to May 16, 2026.

2. **Terms of Service (`src/routes/terms.tsx`)**
   - Apply the same structural and typographic pattern as the Privacy Policy.
   - Insert the full Terms content provided by the user.
   - Update the "Last updated" date to May 16, 2026.

3. **No other files touched.**
   - No new routes, no dependency installs, no SEO lib changes.

### Styling details
Container: `max-w-[720px] mx-auto px-4 sm:px-6 py-12 text-[16px] leading-[1.8]`
H2: `font-display tracking-tight text-2xl sm:text-3xl font-bold mt-12 mb-4 text-foreground`
H3: `font-display tracking-tight text-xl sm:text-2xl font-semibold mt-8 mb-3 text-foreground`
P: `my-5 leading-[1.8]`
UL/OL: list styles with `pl-6`, `my-4/5`, `space-y-2`
LI: `leading-[1.8]`
Strong: `font-semibold text-foreground`
Links: `text-primary underline underline-offset-2 hover:opacity-80`
