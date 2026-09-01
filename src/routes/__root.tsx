import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import appCss from "../styles.css?url";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { scrollToTop } from "@/hooks/use-scroll-top";

const Toaster = lazy(() => import("sonner").then((m) => ({ default: m.Toaster })));

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "2hyKSKE090h_itU_-4tDUKfls2uyYJjxHoPwWazd__A" },
      // NOTE: title/description/og:*/twitter:* were previously hardcoded here
      // too, with old marketing copy ("Download videos from TikTok...") and
      // an og:image pointing at a dead Lovable preview-app URL. Because meta
      // tags with the same property/name aren't deduplicated across root +
      // route head() calls, having both here AND in buildPageMeta() (used by
      // every real page) meant social crawlers were picking up whichever
      // set rendered first in <head> — the stale one here, not the correct
      // per-page one. Every route sets its own correct title/description/
      // OG/Twitter tags via buildPageMeta() in src/lib/seo.ts, so this root
      // block is intentionally minimal now — no duplicate, no conflict.
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png?v=2" },
      { rel: "shortcut icon", type: "image/png", href: "/favicon.png?v=2" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=2" },
      { rel: "stylesheet", href: appCss, fetchpriority: "high" } as any,
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preload", as: "style", href: FONTS_HREF },
      { rel: "preload", as: "image", href: "/logo.webp", fetchpriority: "high" } as any,
    ],
    scripts: [
      {
        children: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(FONTS_HREF)};l.media='print';l.onload=function(){l.media='all'};document.head.appendChild(l);})();`,
      },
      {
        // AdSense loads on first user interaction, or shortly after the
        // page's load event as a fallback — kept short (not the previous
        // 2500ms) so automated review/crawl checks are more likely to see
        // the script actually fire. It already only runs after 'load', so
        // it was never competing with LCP either way.
        //
        // IMPORTANT: do NOT add a manual `.push({enable_page_level_ads:true})`
        // call here. Since 2021, Google's script tag alone — loaded with
        // `?client=ca-pub-...` in the URL — already activates Auto Ads and
        // the EU consent-message pipeline by itself. Adding a manual push
        // call (as a previous version of this file did) causes a duplicate
        // registration and throws "Uncaught TagError: adsbygoogle.push()
        // error: Only one 'enable_page_level_ads' allowed per page.",
        // which was confirmed via DevTools to be blocking real ad requests
        // — and therefore the consent message — from ever firing (0
        // impressions recorded in Privacy & messaging for over a week).
        children: `(function(){var done=false;function load(){if(done)return;done=true;var s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6659226851425915';document.head.appendChild(s);}['pointerdown','keydown','touchstart','scroll'].forEach(function(e){window.addEventListener(e,load,{once:true,passive:true});});window.addEventListener('load',function(){setTimeout(load,400);});})();`,
      },

      {
        children: `window.addEventListener('load',function(){setTimeout(function(){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=G-WHRM5Z08KR';document.head.appendChild(s);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-WHRM5Z08KR');},3000);});`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `*,::before,::after{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Inter",sans-serif;background:#ffffff;color:#0f172a}.dark body{background:#0a0f1e;color:#fff}.bg-hero{background:linear-gradient(135deg,#0a0f1e 0%,#0d1b3e 100%);color:#fff}h1{margin:0}.min-h-screen{min-height:100vh}.flex{display:flex}.flex-col{flex-direction:column}.flex-1{flex:1 1 0%}`,
          }}
        />
        <HeadContent />
        <noscript>
          <link rel="stylesheet" href={FONTS_HREF} />
        </noscript>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [toasterReady, setToasterReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setToasterReady(true), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <ThemeProvider>
      <RouteScrollManager />
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      {toasterReady && (
        <Suspense fallback={null}>
          <Toaster position="top-center" richColors />
        </Suspense>
      )}
    </ThemeProvider>
  );
}

function RouteScrollManager() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => scrollToTop("auto"), [pathname]);

  return null;
}
