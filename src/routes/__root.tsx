import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import appCss from "../styles.css?url";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const Toaster = lazy(() => import("sonner").then((m) => ({ default: m.Toaster })));

const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Skycally — Every Tool You Need, Free" },
      { name: "description", content: "Download videos from TikTok, Instagram & YouTube. Convert images, merge PDFs, remove backgrounds — free, fast, no signup." },
      { property: "og:title", content: "Skycally — Every Tool You Need, Free" },
      { property: "og:description", content: "Download videos from TikTok, Instagram & YouTube. Convert images, merge PDFs, remove backgrounds — free, fast, no signup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Skycally — Every Tool You Need, Free" },
      { name: "twitter:description", content: "Download videos from TikTok, Instagram & YouTube. Convert images, merge PDFs, remove backgrounds — free, fast, no signup." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/36f52cd1-4e12-4753-ba42-0d91bb380fa8/id-preview-0354be22--b6e9d496-e7b7-4da9-998a-b834f11e8737.lovable.app-1777921624295.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/36f52cd1-4e12-4753-ba42-0d91bb380fa8/id-preview-0354be22--b6e9d496-e7b7-4da9-998a-b834f11e8737.lovable.app-1777921624295.png" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png?v=2" },
      { rel: "shortcut icon", type: "image/png", href: "/favicon.png?v=2" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=2" },
      { rel: "preload", as: "style", href: appCss, onload: "this.onload=null;this.rel='stylesheet'" } as unknown as { rel: string; href: string },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preload", as: "style", href: FONTS_HREF },
    ],
    scripts: [
      {
        children: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(FONTS_HREF)};l.media='print';l.onload=function(){l.media='all'};document.head.appendChild(l);})();`,
      },
      {
        children: `window.addEventListener('load',function(){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=G-WHRM5Z08KR';document.head.appendChild(s);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-WHRM5Z08KR');});`,
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
        <HeadContent />
        <noscript>
          <link rel="stylesheet" href={FONTS_HREF} />
          <link rel="stylesheet" href={appCss} />
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
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <Suspense fallback={null}>
        <Toaster position="top-center" richColors />
      </Suspense>
    </ThemeProvider>
  );
}
