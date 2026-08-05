import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";

const post = getBlogPostBySlug("3-months-of-search-console-data-free-tools-site")!;

export const Route = createFileRoute("/blog/3-months-of-search-console-data-free-tools-site")({
  head: () => {
    const base = buildPageMeta({
      title: post.title,
      description: post.description,
      path: post.path,
    });
    return {
      ...base,
      meta: [...base.meta, { property: "og:type", content: "article" }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            datePublished: post.date,
            dateModified: post.date,
            author: {
              "@type": "Organization",
              name: "Skycally",
              url: "https://skycally.com",
            },
            publisher: {
              "@type": "Organization",
              name: "Skycally",
              url: "https://skycally.com",
              logo: {
                "@type": "ImageObject",
                url: "https://skycally.com/favicon.ico",
              },
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
        Most "here's how to grow a website" advice is written by people who don't run the site they're writing
        about. We do. Skycally now has 39 free tools live, spanning calculators, image utilities, PDF tools, and a
        growing collection of party games and quizzes. Three months ago we started actually reading our own Google
        Search Console and Analytics data instead of guessing — and some of what it showed us was not what we
        expected.
      </p>
      <p>
        This isn't a "10 SEO tips" post. It's the actual numbers from our own site, over a real three-month window,
        with the surprises, the dead ends, and the one pattern that changed how we prioritize what to build next.
      </p>

      <h2>The headline number: 1,205 clicks, 95,617 impressions</h2>
      <p>
        Over three months, Skycally's 165 indexed tool pages generated 1,205 clicks from 95,617 impressions in
        Google Search — an overall click-through rate of about 1.26%. On its own, that number means almost nothing.
        What matters is how unevenly it's distributed.
      </p>

      <h2>Four tools we didn't expect to win</h2>
      <p>
        Before we looked at the data, we assumed our financial calculators or our newest quizzes would be the top
        performers. Instead, four tools we'd barely discussed internally were carrying most of the traffic:
      </p>
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card">
            <tr>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Tool</th>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Clicks</th>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Impressions</th>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Avg. position</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-3 border-b border-border">Element Mixer</td>
              <td className="px-4 py-3 border-b border-border">194</td>
              <td className="px-4 py-3 border-b border-border">1,274</td>
              <td className="px-4 py-3 border-b border-border">9.73</td>
            </tr>
            <tr>
              <td className="px-4 py-3 border-b border-border">Truth or Dare</td>
              <td className="px-4 py-3 border-b border-border">127</td>
              <td className="px-4 py-3 border-b border-border">2,791</td>
              <td className="px-4 py-3 border-b border-border">15.72</td>
            </tr>
            <tr>
              <td className="px-4 py-3 border-b border-border">Hand Gesture</td>
              <td className="px-4 py-3 border-b border-border">125</td>
              <td className="px-4 py-3 border-b border-border">826</td>
              <td className="px-4 py-3 border-b border-border">10.29</td>
            </tr>
            <tr>
              <td className="px-4 py-3">Role Spinner</td>
              <td className="px-4 py-3">92</td>
              <td className="px-4 py-3">1,857</td>
              <td className="px-4 py-3">8.66</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Together, these four tools brought in roughly a third of all clicks on the entire site — from just 4 of our
        165 pages. None of them are our most "serious" tools. They're quick, playful, and require zero setup: open
        the page, do the thing, get an instant result. That pattern kept showing up.
      </p>

      <h2>The category breakdown that corrected our assumptions</h2>
      <p>
        We also broke performance down by category to see which parts of the site were pulling their weight:
      </p>
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card">
            <tr>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Category</th>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Clicks</th>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Tools in category</th>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Avg. clicks / tool</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-3 border-b border-border">AI tools</td>
              <td className="px-4 py-3 border-b border-border">235</td>
              <td className="px-4 py-3 border-b border-border">12</td>
              <td className="px-4 py-3 border-b border-border">19.6</td>
            </tr>
            <tr>
              <td className="px-4 py-3 border-b border-border">Games</td>
              <td className="px-4 py-3 border-b border-border">229</td>
              <td className="px-4 py-3 border-b border-border">11</td>
              <td className="px-4 py-3 border-b border-border">20.8</td>
            </tr>
            <tr>
              <td className="px-4 py-3 border-b border-border">Utility</td>
              <td className="px-4 py-3 border-b border-border">306</td>
              <td className="px-4 py-3 border-b border-border">53</td>
              <td className="px-4 py-3 border-b border-border">5.8</td>
            </tr>
            <tr>
              <td className="px-4 py-3">Minigames</td>
              <td className="px-4 py-3">49</td>
              <td className="px-4 py-3">30</td>
              <td className="px-4 py-3">1.6</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The gap between Games (20.8 clicks per tool on average) and Minigames (1.6) surprised us the most — until we
        looked closer. It isn't "games beat puzzles" as a rule. Almost all of the Games category's clicks came from
        just two tools, <Link to="/tools/truth-or-dare">Truth or Dare</Link> and{" "}
        <Link to="/tools/role-spinner">Role Spinner</Link> — both simple, randomizer-style mechanics. Several of our
        newer quiz-style tools had barely any data yet, simply because they hadn't been live long enough for Google
        to rank them. We're resisting the urge to draw a bigger conclusion than the data actually supports — we'll
        revisit this specific comparison again once those newer tools have had a fair amount of time to be indexed.
      </p>

      <h2>The single biggest missed opportunity we found</h2>
      <p>
        This is the number that changed what we work on next. Our <Link to="/tools/word-counter">Word Counter</Link>{" "}
        tool had 9,918 impressions over three months — by far the most search visibility of any non-SEO tool on the
        site — and exactly zero clicks. Every major query variant ("word counter online," "online word count," "word
        count online") sat consistently around position 28–34: page 3 or 4 of Google. Real, proven demand, and a
        page that was simply too far down the results to ever get seen.
      </p>
      <p>
        That's a fundamentally different problem than "nobody wants this." The demand was already there, documented,
        in our own data. The fix wasn't a new tool — it was tightening the page's title and content around the exact
        phrasing people were already searching for.
      </p>

      <h2>Geography told us who's searching and who's finding us</h2>
      <p>
        Cross-referencing Search Console with our Analytics country data added a layer we hadn't considered: where
        our impressions come from doesn't match where our clicks convert well.
      </p>
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card">
            <tr>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Country</th>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Clicks</th>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Impressions</th>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Avg. position</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-3 border-b border-border">United States</td>
              <td className="px-4 py-3 border-b border-border">235</td>
              <td className="px-4 py-3 border-b border-border">45,795</td>
              <td className="px-4 py-3 border-b border-border">64.42</td>
            </tr>
            <tr>
              <td className="px-4 py-3 border-b border-border">United Kingdom</td>
              <td className="px-4 py-3 border-b border-border">57</td>
              <td className="px-4 py-3 border-b border-border">6,316</td>
              <td className="px-4 py-3 border-b border-border">61.08</td>
            </tr>
            <tr>
              <td className="px-4 py-3 border-b border-border">South Korea</td>
              <td className="px-4 py-3 border-b border-border">48</td>
              <td className="px-4 py-3 border-b border-border">292</td>
              <td className="px-4 py-3 border-b border-border">5.88</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Nearly half of our total impressions come from the US, but our average position there (64.42 — page 7) is
        the worst of any major market we see traffic from. Meanwhile South Korea, a much smaller slice of our
        impressions, ranks us at position 5.88 on average. The US audience is exactly the one worth ranking well
        for — it just isn't happening yet. That's a gap we're actively working on, not a finished success story.
      </p>

      <h2>What this actually changed for us</h2>
      <p>
        We stopped treating "build more tools" and "improve existing tools" as the same priority. Before this
        analysis, our instinct was to keep shipping new tools every week. The data made a simpler case: some of our
        highest-traffic-potential pages (Word Counter being the clearest example) already had the audience — they
        just needed the content tightened around what people were actually typing into Google. That's cheaper and
        faster than building something new from scratch, and it's directly supported by evidence instead of a guess.
      </p>
      <p>
        We're sharing the raw shape of this data publicly, warts and all, because most "case study" content online
        is written to make the author look good. This is closer to what actually happened: some tools we didn't
        expect to succeed are our biggest wins, our most polished page had almost no visibility until we dug in and
        found query-level demand, and our best market on paper (the US) is currently our worst-ranked one. We'll keep
        updating this as the picture changes.
      </p>

      <h2>Where these numbers actually came from</h2>
      <p>
        Nothing here is estimated. Every figure in this post comes directly from Google Search Console's Performance
        report (the same three-month window, filtered to <code>skycally.com</code>) exported and cross-referenced
        against our full internal list of live tools, plus a country-level export from Google Analytics for the
        geography section. We didn't round up, cherry-pick a good week, or exclude anything that made us look worse
        — the Word Counter zero-click number and the US ranking gap are both things we'd rather not have found, and
        we're including them anyway because they're the most useful data points in this whole post.
      </p>

      <h2>What we're doing next</h2>
      <p>
        Two concrete changes came directly out of this analysis. First, we're going through our highest-impression,
        lowest-click pages one at a time — Word Counter was the clearest case, but it wasn't the only one — and
        rewriting titles and content around the exact phrasing Search Console shows people actually searching for.
        Second, we've paused adding brand-new tools to the site until that cleanup pass is further along. Publishing
        more pages doesn't help if the pages we already have aren't being found by the people already looking for
        them.
      </p>
      <p>
        We'll follow up on this post once we have another few months of data — specifically on whether the newer
        quiz-style games catch up to Truth or Dare and Role Spinner once Google has had time to index them properly,
        and whether the US ranking gap actually closes.
      </p>

      <div className="mt-6">
        <Link
          to="/tools/word-counter"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold !text-primary-foreground !no-underline transition hover:opacity-90"
        >
          Try the Word Counter <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </BlogPostLayout>
  );
}
