import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";

const post = getBlogPostBySlug("why-we-rejected-5-tool-ideas")!;

export const Route = createFileRoute("/blog/why-we-rejected-5-tool-ideas")({
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
        Search volume is the easiest number to find and the easiest one to misread. A keyword with a million
        monthly searches looks like an obvious opportunity right up until you check who already occupies every spot
        on the first page — and how long they've been sitting there. Before adding new tools to Skycally, we ran a
        proper competitive analysis on our shortlist first, instead of just building whatever had the biggest search
        numbers attached to it. Five ideas that looked genuinely promising on paper got cut, each for a slightly
        different reason. Here's why, with the actual numbers behind each individual decision.
      </p>

      <h2>What we actually measured</h2>
      <p>
        Search volume alone tells you demand exists, not whether that demand is reachable. For each candidate idea
        we also checked domain authority of the sites currently ranking (a rough proxy for how hard they are to
        outrank), how many well-optimized competitors occupy the first page rather than just one dominant player,
        and — where available — a keyword difficulty score that estimates how competitive the ranking landscape
        actually is. A big search number next to a page-one field of decade-old, high-authority competitors is a
        bad bet no matter how attractive the raw volume looks; a smaller number with a beatable, mixed-authority
        field is usually the better one. None of these signals alone is decisive — it's the combination that
        actually predicts whether an idea is worth the build time.
      </p>

      <h2>1. Background remover</h2>
      <p>
        The search volume is real and large — well into the millions of monthly searches for "remove background"
        and related terms. The problem is who owns that space: remove.bg, a purpose-built AI background removal
        service, dominates the results with a domain rating in the low 80s and tens of millions of monthly visits.
        Canva and Adobe show up too. Beyond the sheer authority gap, the tool itself requires real machine learning
        infrastructure to do well, not a simple client-side script — a much heavier technical lift than most of the
        tools on this site. There's also a geography factor worth noting: a meaningful share of the dominant
        competitor's traffic comes from markets that typically carry lower advertising rates, which dilutes the
        revenue picture even further beyond the ranking difficulty itself. We passed.
      </p>

      <h2>2. PDF merge, compress, and convert tools</h2>
      <p>
        This is one of the most saturated categories on the entire internet. iLovePDF alone gets over 160 million
        monthly visits and ranks inside the top 30 sites in the world by traffic — ahead of plenty of household-name
        platforms. Smallpdf and PDF24 round out a market that's been fought over for a decade by well-funded,
        well-optimized competitors. Generic "merge PDF" or "compress PDF" head terms simply aren't winnable for a
        new entrant; only very specific format-pair conversions have any realistic long-tail opening, and even
        those are thin. To put the scale of the leader in perspective: iLovePDF's traffic alone puts it among the
        top few dozen most-visited sites in the world, ahead of many mainstream platforms people use daily.
      </p>

      <h2>3. Mortgage and loan calculators</h2>
      <p>
        High advertiser interest, high cost-per-click, genuinely appealing on a revenue-per-visitor basis. But the
        competitive field here is calculator.net, Bankrate, NerdWallet, SmartAsset, Experian, LendingTree, and
        literal banks — Capital One, Bank of America, U.S. Bank all have their own calculator pages backed by
        financial-services-level content budgets and authority. One specific data point made the decision easy: a
        generic "mortgage calculator" search carries a keyword difficulty score of 100 out of 100 by standard SEO
        tooling — about as saturated as a keyword can get. When actual banks are competing directly for a keyword
        alongside dedicated finance-media publishers, a general-purpose free tools site isn't bringing anything a
        visitor can't already get from a source they'd trust more by default.
      </p>

      <h2>4. Tip calculator and age calculator</h2>
      <p>
        These looked appealing precisely because they seemed simple to build fast. The catch is twofold: calculator.net
        and Omnicalculator are deeply entrenched at the top of both, and — more importantly — the actual advertiser
        value per click on these specific terms is low. Simple utility calculators without financial-services intent
        behind them tend to carry low cost-per-click, meaning even a good ranking wouldn't translate into meaningful
        revenue. High effort-to-reward ratio in both directions: hard to rank, and not worth much even if we did.
        Estimated cost-per-click on "age calculator" specifically was well under a quarter of a dollar in our
        research — a real ranking win there simply wouldn't move the needle financially.
      </p>

      <h2>5. Wheel of names / random picker</h2>
      <p>
        wheelofnames.com owns this space outright, with several other established competitors filling out the rest
        of the results. As an extra wrinkle, calculator.net — the same site dominating half the calculators on this
        list — also ranks first for the adjacent "dice roller" term, meaning even the tool's near-neighbors were
        already spoken for by the same handful of entrenched players. A crowded category with a thin margin left
        over for anyone new, and one where the strongest competitor is a purpose-built, single-focus site rather
        than a generalist competitor — usually the hardest kind to unseat.
      </p>

      <h2>What a real opportunity looked like by contrast</h2>
      <p>
        The same research process that rejected these five also surfaced tools worth building — the difference
        wasn't lower search volume, it was who occupied the results. A viral-quiz-style tool we ultimately built,
        for instance, had a category leader ranking first with a domain rating in the mid-40s rather than the
        70s-80s range every idea above was competing against — a genuinely different, more approachable competitive
        picture despite similarly large search interest. That gap between a domain rating in the 40s and one in the
        80s is roughly the difference between a realistic multi-month effort and a category that's effectively
        closed to new entrants no matter how good the execution is.
      </p>

      <h2>The pattern across all five</h2>
      <p>
        Every one of these ideas failed for a version of the same reason: high search volume was being used as the
        only signal, when it's really only half the picture. The other half — who currently ranks, how strong their
        domain authority is, and how much technical or content investment it would take to catch up — is what
        actually determines whether building something is worth the time. A keyword with 300,000 searches and a
        beatable field of mid-authority competitors is a better bet than one with 3 million searches locked down by
        a decade-old market leader.
      </p>

      <h2>If you're evaluating your own idea</h2>
      <p>
        The same check works for any website or content idea, not just tools. Before committing real time to
        something, look at who actually occupies the first page today, not just how big the search number is.
        Check whether the top few results are dominated by one or two entrenched giants, or whether there's a mix
        of authority levels with at least a couple of beatable, mid-tier competitors in the results. A crowded
        field with real diversity in who's ranking is a realistic opportunity; a field owned top-to-bottom by
        decade-old, well-funded players usually isn't, no matter how good the idea is on its own merits. It's a
        five-minute check that can save months of building something that was structurally unlikely to be found.
      </p>

      <h2>What we built instead</h2>
      <p>
        The same research process that ruled out these five also surfaced genuine gaps — categories with real
        search volume where the top results were held by mid-tier, catchable competitors rather than entrenched
        giants. Our <Link to="/tools/image-compressor">Image Compressor</Link> came directly out of that analysis:
        real search demand, and a competitive field with beatable mid-authority sites mixed in among the bigger
        names, unlike the fully locked-down categories above. It's the same evaluation process applied consistently
        — the only thing that changed between a rejected idea and a shipped one was what the competitive field
        actually looked like once we checked.
      </p>

      <p>
        We'd rather publish a shorter list of tools that have a realistic shot at being found than a longer one
        built purely because a keyword tool showed a big number next to it. Saying no to five plausible-looking
        ideas in one sitting isn't a failure of the research — it's the actual point of doing it in the first
        place. The ideas that survive this kind of scrutiny are the ones actually worth the weeks of build time
        that follow.
      </p>

      <div className="mt-6">
        <Link
          to="/tools/image-compressor"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold !text-primary-foreground !no-underline transition hover:opacity-90"
        >
          Try the Image Compressor <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </BlogPostLayout>
  );
}
