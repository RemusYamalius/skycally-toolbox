import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";

const post = getBlogPostBySlug("why-your-paycheck-isnt-what-you-expect")!;

export const Route = createFileRoute("/blog/why-your-paycheck-isnt-what-you-expect")({
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
        You agree to a salary, do the mental math on what that means per paycheck, and then the actual deposit is
        noticeably smaller than expected. That gap isn't a mistake — it's several separate, predictable deductions
        stacking on top of each other, each with its own rules, its own rate, and in some cases its own income cap.
        Once you see each piece individually, the total stops feeling mysterious, and every number below is a real,
        calculated figure rather than a rounded estimate.
      </p>

      <h2>FICA: the tax most people can't name but everyone pays</h2>
      <p>
        FICA (the Federal Insurance Contributions Act) is actually two separate taxes bundled together: Social
        Security and Medicare. As an employee, you pay <strong>6.2%</strong> of your wages to Social Security and{" "}
        <strong>1.45%</strong> to Medicare — a combined <strong>7.65%</strong> — and your employer pays a matching
        7.65% on top, out of their own pocket, that never touches your paycheck at all. On a $60,000 salary, that's
        $3,720 to Social Security and $870 to Medicare, for $4,590 in FICA tax before federal or state income tax
        even enters the picture. If you're self-employed, there's no separate employer to split this with — you pay
        both halves yourself, 15.3% total, through self-employment tax.
      </p>

      <h2>The cap almost nobody knows about</h2>
      <p>
        Here's a detail that surprises most people: Social Security tax doesn't apply to unlimited income. Each
        year, the IRS sets a wage base limit — for 2026, that's $184,500 — and once your year-to-date wages cross
        that line, Social Security withholding simply stops for the rest of the year. Medicare has no such cap; it
        applies to every dollar you earn, no matter how much. On top of that, high earners pay an <strong>extra</strong>{" "}
        0.9% Additional Medicare Tax on wages above $200,000, an employee-only tax with no employer match. Put
        together, someone earning $250,000 pays 6.2% Social Security only on the first $184,500 (capping at
        $11,439), plus 1.45% Medicare on the full $250,000 ($3,625), plus 0.9% Additional Medicare Tax on the
        $50,000 above the $200,000 threshold ($450) — $15,514 total FICA, working out to an effective FICA rate of
        about 6.2% of total income. Compare that to the person earning $60,000, whose entire salary sits well under
        every cap and pays a flat 7.65% FICA rate on all of it. Counterintuitively, FICA becomes proportionally
        cheaper as income rises past the Social Security wage base — the opposite of how income tax brackets work.
      </p>

      <h2>Where federal income tax fits in</h2>
      <p>
        FICA is a flat-rate payroll tax; federal income tax works completely differently. It's progressive, meaning
        different slices of your income are taxed at different rates, and what actually gets withheld from each
        paycheck is an estimate based on the information you gave your employer on Form W-4 — your filing status,
        any dependents, and any additional withholding you requested. That's an estimate, not a final bill: it's
        reconciled every year when you file your tax return, which is why some people get a refund (they had too
        much withheld throughout the year) and others owe money (too little was withheld). Your paycheck's federal
        withholding line is a prediction of your annual tax liability divided across your pay periods, not a fixed
        percentage of that specific paycheck.
      </p>

      <h2>Why the same salary takes home differently by state</h2>
      <p>
        State income tax is where paychecks diverge the most for otherwise identical salaries. Nine states — Alaska,
        Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington, and Wyoming — charge no state
        income tax on wages at all, while others have their own brackets stacked on top of federal tax. Two people
        earning the exact same $70,000 salary, one in Texas and one in a state with meaningful income tax, can end
        up with a take-home pay difference of several thousand dollars a year, with identical FICA and nearly
        identical federal tax. This is the piece a generic "national average" paycheck estimate can't get right,
        and it's exactly why a paycheck calculator needs to ask which state you're in before it can give you a
        useful number.
      </p>

      <h2>How pre-tax deductions actually change the math</h2>
      <p>
        Contributing to a traditional 401(k) or paying for employer health insurance through a Section 125 cafeteria
        plan reduces your taxable income before federal (and usually state) tax is calculated — but it's worth
        knowing exactly which taxes each deduction actually reduces, because it's not all of them equally. On a
        $60,000 salary with a 6% traditional 401(k) contribution ($3,600 a year), your federal taxable income drops
        to $56,400 — but your FICA wages generally stay at the full $60,000, because 401(k) contributions reduce
        income tax, not Social Security or Medicare tax. Health insurance premiums paid through a cafeteria plan
        typically work differently and do reduce FICA wages too. The practical upshot: pre-tax retirement
        contributions lower your income tax bill, but they don't shrink the FICA line on your pay stub the way many
        people assume.
      </p>

      <h2>Putting the whole paycheck together</h2>
      <p>
        Take a $60,000 salary with no pre-tax deductions in a state with no income tax: $4,590 in FICA, plus
        whatever federal withholding your W-4 settings produce, and nothing else — the simplest possible case. Add
        a 6% 401(k) contribution and the federal-taxable portion drops to $56,400 while FICA stays the same. Move
        that same person to a state with income tax, and a third deduction line appears that a national-average
        estimate would never capture correctly. Every one of these pieces is independent — you can be a high earner
        past the Social Security cap in a no-income-tax state with heavy 401(k) contributions, and each of those
        four facts changes a different line on your pay stub without affecting the others.
      </p>

      <h2>Why a bonus check looks even smaller than expected</h2>
      <p>
        Bonuses fall into a separate IRS category called "supplemental wages," and they're commonly withheld
        differently than a regular paycheck. Per IRS Publication 15 (2026), employers can withhold federal income
        tax on supplemental wages at a flat 22% rate for amounts up to $1 million in a calendar year (37% on any
        amount above that) — regardless of what tax bracket you're actually in. On a $5,000 bonus, that's $1,100 in
        federal withholding plus the same 7.65% FICA that applies to regular wages ($382.50), for $1,482.50 withheld
        and $3,517.50 landing in your account before any state tax. If your actual marginal tax rate is below 22%,
        that 22% withholding is simply an overpayment you get back as part of your refund when you file — the flat
        rate is a withholding method, not your real tax rate on that money. Bonus income is still taxed at your
        normal rate at year-end; it just gets withheld more aggressively upfront than your regular salary does.
      </p>

      <h2>Why the same salary looks different depending on how often you're paid</h2>
      <p>
        Pay frequency changes how big each individual check looks without changing your annual take-home pay at
        all. A $60,000 salary paid weekly (52 checks a year) works out to about $1,154 gross per check; paid
        biweekly (26 checks) it's about $2,308; semimonthly (24 checks, twice a month regardless of how many days
        that covers) it's exactly $2,500; and monthly (12 checks) it's $5,000. The annual totals are identical — the
        only thing that changes is how the same yearly amount gets sliced. This matters in two practical ways.
        First, some deductions (like a flat-dollar health insurance premium) are the same every check regardless of
        frequency, so they take a bigger percentage bite out of a weekly check than a monthly one. Second, the
        Social Security wage base cap discussed above is tracked cumulatively across the year, so someone paid
        weekly crosses that cap on a slightly different check-by-check schedule than someone paid monthly, even
        though both hit the same annual cap at the same total income.
      </p>

      <p>
        None of these pieces are hidden or arbitrary — Social Security and Medicare rates are published by the IRS,
        the wage base and Additional Medicare Tax thresholds are set annually and public, state tax rules are
        published by each state's revenue department, and supplemental wage withholding rules are spelled out in
        IRS Publication 15. The confusion isn't that the rules are secret; it's that no single deduction line
        explains the whole gap on its own, and generic "national average" paycheck estimates average away exactly
        the details — your state, your pay frequency, your pre-tax elections, and how close you are to the wage
        base cap — that determine your actual number.
      </p>

      <h2>Try it with your own numbers</h2>
      <p>
        Our <Link to="/tools/paycheck-calculator">Paycheck Calculator</Link> runs through all of this — federal tax,
        state tax, FICA (including the wage base cap and Additional Medicare Tax for high earners), and pre-tax
        deductions — using your actual salary, filing status, and state, instead of a generic national estimate.
      </p>

      <div className="mt-6">
        <Link
          to="/tools/paycheck-calculator"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold !text-primary-foreground !no-underline transition hover:opacity-90"
        >
          Try the Paycheck Calculator <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </BlogPostLayout>
  );
}
