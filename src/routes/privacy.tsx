import { createFileRoute } from "@tanstack/react-router";
import { buildPageMeta } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => buildPageMeta({
    title: "Privacy Policy — Skycally",
    description: "Skycally privacy policy. We respect your data and don't store your files. Most tools run entirely in your browser.",
    path: "/privacy",
  }),
  component: () => (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 prose prose-sm dark:prose-invert">
      <h1 className="font-display text-4xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: 2025</p>
      <h2 className="font-display text-xl font-semibold mt-8 mb-2">Files & Data</h2>
      <p className="text-muted-foreground">Most Skycally tools run entirely in your browser. We do not upload, store, or share your files.</p>
      <h2 className="font-display text-xl font-semibold mt-8 mb-2">Cookies & Ads</h2>
      <p className="text-muted-foreground">We may serve advertisements via Google AdSense. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to our website or other sites.</p>
      <h2 className="font-display text-xl font-semibold mt-8 mb-2">Contact</h2>
      <p className="text-muted-foreground">Questions? Reach us at hello@skycally.com.</p>
    </div>
  ),
});
