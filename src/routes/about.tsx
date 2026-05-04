import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Skycally" },
      { name: "description", content: "Skycally brings every essential online tool into one fast, free, no-signup platform." },
      { property: "og:title", content: "About Skycally" },
      { property: "og:description", content: "Every tool you need, one place." },
    ],
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
