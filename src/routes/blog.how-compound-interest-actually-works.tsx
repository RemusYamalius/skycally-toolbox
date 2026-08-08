import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";

const post = getBlogPostBySlug("how-compound-interest-actually-works")!;

export const Route = createFileRoute("/blog/how-compound-interest-actually-works")({
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
        "Compound interest is the eighth wonder of the world" gets quoted constantly and explains almost nothing.
        What actually makes compounding powerful isn't mysterious — it's one specific mechanical fact: your interest
        starts earning its own interest. Once you can see exactly where that extra growth comes from, the rest of
        the topic — why monthly contributions matter so much, why the interest rate you're quoted isn't always the
        rate you actually earn, and why a decade of head start can matter more than a better rate — falls into
        place. None of it requires trusting a rule of thumb; every number below is calculated directly from the
        formula, not rounded for effect.
      </p>

      <h2>The formula, in plain terms</h2>
      <p>
        The standard compound interest formula is:
      </p>
      <p>
        <strong>A = P × (1 + r/n)^(n×t)</strong>
      </p>
      <p>
        Where <strong>P</strong> is your starting principal, <strong>r</strong> is the annual interest rate as a
        decimal, <strong>n</strong> is how many times per year interest compounds, and <strong>t</strong> is the
        number of years. That's the whole engine. Everything people find surprising about compound interest comes
        from what happens when you let <strong>t</strong> get large, or when you add <strong>n</strong> (compounding
        frequency) into the mix.
      </p>

      <h2>A worked example with real numbers</h2>
      <p>
        Say you deposit $10,000 at a 6% annual rate, compounded monthly, for 20 years. Plugging into the formula: P
        = 10,000, r = 0.06, n = 12, t = 20.
      </p>
      <p>
        A = 10,000 × (1 + 0.06/12)^(12×20) = 10,000 × (1.005)^240 ≈ <strong>$33,102</strong>
      </p>
      <p>
        Your $10,000 more than tripled without you adding another dollar. But here's the detail that trips people
        up: only $10,000 of that $33,102 is your original deposit. The remaining roughly $23,102 is interest — and
        a large chunk of that interest wasn't earned on your original $10,000 at all. It was earned on interest that
        had already been added to your balance in earlier years. That's the entire mechanism. Simple interest on
        $10,000 at 6% for 20 years would only get you to $22,000 ($10,000 + 20 × $600) — less than the interest
        alone in the compound version.
      </p>

      <h2>Why monthly contributions change the picture entirely</h2>
      <p>
        Almost nobody just deposits a lump sum and walks away — most real savings involve regular contributions,
        and this is where the basic formula above stops being enough. With monthly contributions, the calculation
        becomes a sum of a lump-sum growth term and a series (technically an annuity) term:
      </p>
      <p>
        <strong>A = P × (1 + r/n)^(n×t) + PMT × [((1 + r/n)^(n×t) − 1) / (r/n)]</strong>
      </p>
      <p>
        where <strong>PMT</strong> is your regular contribution amount. Take the same $10,000 starting balance and
        6% rate, but now add $200 every month for 20 years. The lump-sum portion still grows to about $33,102 as
        before. The contributions add roughly another $92,000 on top of that — because each $200 deposit gets its
        own multi-decade runway to compound, with the earliest contributions doing dramatically more work than the
        later ones. The combined total lands well above $125,000, from $10,000 initial plus $48,000 in total
        contributions ($200 × 240 months) — meaning contributions and growth roughly split the difference between
        principal and interest almost evenly. This is the single biggest reason financial advice repeats "start
        early" so relentlessly: a dollar contributed in year one compounds for 20 years, while a dollar contributed
        in year nineteen only gets one year of growth.
      </p>

      <h2>Interest rate vs. APY: the distinction most explanations skip</h2>
      <p>
        The rate a bank advertises and the rate you actually earn aren't always the same number, and the gap comes
        entirely from compounding frequency. A 6% rate compounded annually gives you exactly 6% growth over a year.
        The same 6% rate compounded monthly gives you (1 + 0.06/12)^12 − 1 ≈ 6.17% actual annual growth — because
        you're earning interest on interest within the year itself, not just year over year. That effective number
        is called the Annual Percentage Yield (APY), and it's always equal to or higher than the stated nominal
        rate, with the gap widening as compounding frequency increases (daily compounding pushes it slightly higher
        still than monthly). When comparing two savings accounts, the APY — not the advertised rate — is the number
        that tells you what you'll actually earn.
      </p>

      <h2>The variable that matters more than the interest rate</h2>
      <p>
        Time is doing more work in these formulas than most people expect, because it sits in an exponent while the
        rate is just a linear multiplier. Doubling your interest rate roughly doubles your growth rate. Doubling
        your time horizon can multiply your total growth several times over, because the exponent doesn't just add —
        it compounds the compounding. Concretely: money left to grow at 6% for 40 years grows to about 3.3 times
        what the same money grows to in 20 years at the same rate — not twice as much, despite twice the time. This
        is why the practical advice around compound interest almost always comes back to starting sooner rather than
        finding a slightly higher rate: an extra 10 years of runway usually beats an extra percentage point of
        return.
      </p>

      <h2>The number nobody adjusts for: inflation</h2>
      <p>
        Every example above uses nominal growth — the raw number your account balance shows. What that money can
        actually buy years from now is a different question, and it depends on inflation eating into that growth
        the entire time. The rough version of the math (known as the Fisher approximation) is: real return ≈ nominal
        rate − inflation rate. At a 6% nominal return and 3% average inflation, your real return is closer to 3%,
        not 6%. Run that same $10,000 for 20 years at a nominal 6% and you land at roughly $32,071. Run it at the
        inflation-adjusted 2.9% real rate instead, and the same starting point only reaches about $17,757 in
        today's purchasing power. Neither number is "wrong" — one tells you what your statement will say, the other
        tells you what that money will actually be worth. Long-term financial planning should generally use the
        real number, since it's the one that reflects what you can actually buy with it later.
      </p>

      <h2>Three misconceptions worth clearing up</h2>
      <p>
        <strong>"A higher rate always beats more time."</strong> Not necessarily — as shown above, doubling your
        time horizon can multiply total growth by more than doubling your rate does, because time sits in the
        exponent of the formula and the rate doesn't. A realistic extra decade of compounding often outweighs
        chasing an extra percentage point of return, especially once you account for the higher risk that usually
        comes with higher advertised rates.
      </p>
      <p>
        <strong>"Compounding monthly versus annually makes a huge difference."</strong> It makes some difference —
        we calculated it above as roughly 0.17 percentage points of extra effective yield at 6% — but it's a small
        effect compared to rate, time, and contribution size. Chasing daily-compounding accounts over
        monthly-compounding ones for a fraction of a percent of extra yield usually isn't worth optimizing hard for;
        picking a meaningfully higher rate or contributing consistently matters far more.
      </p>
      <p>
        <strong>"Compound interest only matters for large sums."</strong> The math doesn't care about the size of
        the starting number — percentages scale proportionally regardless of whether you start with $100 or
        $100,000. What actually matters is the combination of rate, time, and consistency of contributions, which is
        exactly why starting a small, regular contribution habit early tends to outperform waiting to "have enough"
        to start with a larger lump sum later. A modest amount started now, left alone for decades, regularly beats
        a much larger amount started a decade later.
      </p>

      <h2>Starting at 25 versus starting at 35</h2>
      <p>
        This is the comparison behind most "start now" advice, and it's worth seeing with real numbers instead of
        taking it on faith. Suppose two people each invest $300 a month at a 7% annual return, compounded monthly.
        One starts at 25 and stops contributing at 65 — 40 years of contributions. The other starts at 35 and also
        stops at 65 — 30 years of contributions. The first person contributes $144,000 total over their lifetime;
        the second contributes $108,000 — only $36,000 less. But the first person's balance at 65 comes out to
        roughly $787,000, while the second's reaches about $366,000. Ten extra years of contributions, worth $36,000
        more in total deposits, produced over $420,000 more in final balance. That gap is entirely the compounding
        effect of the extra decade — not a bigger contribution, just an earlier start.
      </p>

      <h2>Try it with your own numbers</h2>
      <p>
        All of this math is exactly what our <Link to="/tools/compound-interest">Compound Interest Calculator</Link>{" "}
        runs behind the scenes — starting balance, monthly contributions, interest rate, and time horizon, with the
        year-by-year breakdown so you can see how much of your final balance is principal, contributions, and pure
        interest. If you're deciding between a lump sum now versus smaller contributions spread out, or just want to
        see what an extra $50 a month actually does over 20 years, plugging your real numbers in is far more useful
        than any generic example — including the ones above.
      </p>
      <p>
        If you're comparing this against take-home pay to figure out what you can realistically set aside each
        month, our <Link to="/tools/paycheck-calculator">Paycheck Calculator</Link> and{" "}
        <Link to="/tools/retirement-calculator">Retirement Calculator</Link> use the same underlying math for
        longer-horizon planning.
      </p>

      <div className="mt-6">
        <Link
          to="/tools/compound-interest"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold !text-primary-foreground !no-underline transition hover:opacity-90"
        >
          Try the Compound Interest Calculator <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </BlogPostLayout>
  );
}
