import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";

const post = getBlogPostBySlug("silent-bug-costing-ad-revenue-39-pages")!;

export const Route = createFileRoute("/blog/silent-bug-costing-ad-revenue-39-pages")({
  head: () => {
    const base = buildPageMeta({
      title: post.title,
      description: post.description,
      path: post.path,
      ogType: "article",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            datePublished: post.date,
            dateModified: post.date,
            author: { "@type": "Organization", name: "Skycally", url: "https://skycally.com" },
            publisher: {
              "@type": "Organization",
              name: "Skycally",
              url: "https://skycally.com",
              logo: { "@type": "ImageObject", url: "https://skycally.com/favicon.ico" },
            },
            url: `https://skycally.com${post.path}`,
            description: post.description,
          }),
        },
      ],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  return (
    <BlogPostLayout post={post}>
      <p>
        No error message. No broken layout. No console warning. Every page loaded fine, every tool worked exactly as
        intended. That's precisely what makes this kind of bug dangerous — nothing about visiting the page tells you
        it's there. We only found it because we went looking for something specific and stumbled onto something
        much bigger.
      </p>

      <h2>What we were actually looking for</h2>
      <p>
        We'd just finished analyzing three months of our own Search Console data (we wrote about that separately)
        and wanted to confirm one specific thing before moving on: did every tool page actually have an ad placement
        on it? It seemed like a formality. We'd built ad slots into the standard page template ages ago, and every
        new tool followed that template. A quick check felt like it would take five minutes and confirm what we
        already assumed.
      </p>
      <p>
        Instead, a simple search through every route file turned up 45 tool pages with no ad component at all. Not
        45 pages with a bug in the ad code — 45 pages where the ad slot had simply never been added in the first
        place. After excluding a small set of pages we'd deliberately left unmonetized for unrelated reasons, that
        left 39 real, live, indexed tool pages quietly earning nothing.
      </p>

      <h2>How something that big goes unnoticed</h2>
      <p>
        The honest answer is that it happened gradually, and gradual is exactly what slips past a normal workflow.
        Tools built early on, before the ad template was finalized, never got retrofitted. A few newer tools were
        built quickly to hit a deadline and the ad placement step got skipped in the rush. None of it happened in
        one moment you'd notice — it accumulated one missing line at a time across weeks, and no single page looked
        wrong on its own.
      </p>
      <p>
        This is the part worth sitting with: every one of those 39 pages passed a normal visual check. You'd open
        the page, see the tool working, see the layout looking clean, and move on. A missing ad slot doesn't throw
        an error or leave a visible gap most people would notice — it just quietly isn't there. The only way to
        catch it was to stop trusting "it looks fine" and go check the actual source of every single page against a
        checklist.
      </p>

      <h2>The one detail that made the fix faster than expected</h2>
      <p>
        While going through the list, we noticed something that turned a 39-page fix into something closer to a
        36-page fix. Four of the affected tools — our loan, mortgage, car loan, and EMI calculators — aren't
        actually four separate files. They're four thin wrapper pages that all render the exact same shared
        component, each passing in a different configuration. Once we realized that, fixing the ad placement once
        inside that shared component fixed all four calculators simultaneously, instead of needing four nearly
        identical edits.
      </p>
      <p>
        It's a small thing, but it's exactly the kind of detail that only shows up when you actually go looking at
        how pages are built, not just how they render. Two calculators that look completely independent to a
        visitor can share 100% of their underlying code — which is efficient for building them in the first place,
        but means a bug in that shared code silently affects every page built on top of it at once. It's the same
        risk in reverse: what makes a bug spread quickly across many pages can also make the fix apply to all of
        them at once, if you know where to look.
      </p>

      <h2>What actually changed after the fix</h2>
      <p>
        Every one of the 39 tools — including <Link to="/tools/link-shortener">our link shortener</Link>,{" "}
        <Link to="/tools/word-processor">word processor</Link>, and{" "}
        <Link to="/tools/margin-calculator">margin calculator</Link> — now has a properly placed ad slot in the same
        position as every other tool on the site. None of them needed new content, new features, or any change to
        how the tool itself works. The fix was entirely structural: one missing component, added back in 39 places
        (36, really, thanks to that shared calculator file).
      </p>

      <h2>The actual lesson</h2>
      <p>
        "It looks fine when I open it" is not the same thing as "it's built correctly," and the gap between those
        two only grows as a site gets bigger. At 5 tools, you can hold the whole structure in your head. At 165, you
        can't — and the only reliable way to know something is consistent across every page is to actually check
        every page against a list, not to trust that it probably followed the pattern. We're now treating that kind
        of full-site audit as a routine thing to repeat periodically, not a one-time cleanup.
      </p>

      <h2>If you're running a multi-page site yourself</h2>
      <p>
        The specific bug was about ad placement, but the underlying failure mode is generic and applies to almost
        any site that grows past a handful of pages: analytics snippets, schema markup, canonical tags, internal
        links, accessibility attributes — anything that's supposed to be on every page but doesn't visibly break
        anything when it's missing. A quick way to check your own site for the same class of problem is to pick one
        thing that should be universal (an ad slot, a tracking script, a specific meta tag) and grep your entire
        codebase for it, page by page, rather than spot-checking a few pages and assuming the rest match. It takes
        a few minutes and it's the only way we'd have actually found this.
      </p>

      <div className="mt-6">
        <Link
          to="/tools/link-shortener"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold !text-primary-foreground !no-underline transition hover:opacity-90"
        >
          Try the Link Shortener <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </BlogPostLayout>
  );
}
