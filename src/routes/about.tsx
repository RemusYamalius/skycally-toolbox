import { createFileRoute } from "@tanstack/react-router";
import { buildPageMeta } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => buildPageMeta({
    title: "About Skycally — Free Browser Tools for Everyone",
    description: "Learn about Skycally, the free online toolkit with 40+ tools that run entirely in your browser with no signup required.",
    path: "/about",
  }),
  component: () => (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-display text-4xl sm:text-5xl font-bold">About Skycally</h1>
      <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
        Skycally is a free toolbox for the modern web. We bring together every utility you reach for daily — video downloaders, image converters, PDF tools, background removers — into one beautifully fast experience.
      </p>
      <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
        No accounts. No watermarks. No nonsense. Just tools that work.
      </p>
    </div>
  ),
});
