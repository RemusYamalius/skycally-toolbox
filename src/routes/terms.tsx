import { createFileRoute } from "@tanstack/react-router";
import { buildPageMeta } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () => buildPageMeta({
    title: "Terms of Service — Skycally",
    description: "Skycally terms of service. Use our free tools responsibly and only for content you have rights to.",
    path: "/terms",
  }),
  component: () => (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-display text-4xl font-bold mb-6">Terms of Service</h1>
      <p className="text-muted-foreground">By using Skycally, you agree to use our tools responsibly and only for content you have rights to.</p>
      <p className="mt-4 text-muted-foreground">Skycally is provided "as is" without warranties. We are not responsible for misuse of any downloaded or processed content.</p>
    </div>
  ),
});
