import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";

const post = getBlogPostBySlug("why-purity-test-quizzes-go-viral")!;

export const Route = createFileRoute("/blog/why-purity-test-quizzes-go-viral")({
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
        Every few years, a version of the same checklist resurfaces on whatever platform happens to be dominant at
        the time — message boards, then Facebook, then group chats, now short-form video. The format never really
        changes: a long list of statements, check off what applies, get a single number at the end. That format has
        outlasted multiple entire generations of internet platforms, which is a strange kind of staying power for
        something with no developer, no marketing budget, and no company behind it at all. There's a real
        explanation for that staying power, and it isn't just novelty — it's a small set of specific psychological
        mechanisms working together.
      </p>

      <h2>A tradition older than the platforms it spreads on</h2>
      <p>
        The most well-known version of this format traces back to a college tradition — a checklist originally
        associated with orientation week at Rice University, used informally among students as a icebreaker and a
        rough, joking measure of how "wild" a first-year class was collectively. Long before any of it existed as a
        website, it existed as a printed sheet passed around a dorm. The internet didn't invent the format; it just
        gave a decades-old paper tradition a way to spread far outside the specific campus culture that originated
        it, and to be rediscovered by an entirely new audience roughly every time a new platform becomes dominant.
        That resilience across such different eras of the internet is worth taking seriously as a signal — a format
        doesn't survive that many platform migrations by accident.
      </p>

      <h2>The specific thing that makes it spread: a comparable number</h2>
      <p>
        Social comparison theory, first proposed by psychologist Leon Festinger, describes a basic human tendency to
        evaluate ourselves by comparing to others, especially in situations where there's no objective yardstick.
        "How much have I experienced compared to my peers?" is exactly that kind of ambiguous, hard-to-measure
        question — and a purity test collapses it into a single, directly comparable number. That's the specific
        mechanism that separates this format from a generic personality quiz: two friends can't meaningfully compare
        "which Hogwarts house" they got, but they can immediately and precisely compare a 62 to a 41. A single
        number is inherently shareable in a way a paragraph of description isn't.
      </p>

      <h2>Why a percentage out of 100 specifically, and not some other scale</h2>
      <p>
        Percentages are one of the few numeric scales nearly everyone already has an intuitive feel for from school
        grading systems, so a score needs zero explanation to interpret — everyone immediately understands that 90
        is high and 20 is low without being told what the scale means. A five-point scale or an arbitrary point
        total would require the person you're showing it to pause and ask "wait, out of how much?" before the
        comparison could even happen. A percentage removes that friction entirely, which matters more than it
        sounds like it should for a format whose entire value depends on instant comparison between two people.
      </p>

      <h2>Why it's such good short-form video material</h2>
      <p>
        The format happens to line up almost perfectly with what makes content easy to create and easy to watch in
        a short clip: a visible countdown or checklist, a build-up, and a punchline number at the end — structurally
        similar to a lot of native short-form video formats already built around reveals and reactions. Recording a
        reaction to your own score, or filming a group taking the test together and reacting to each other's
        numbers in real time, requires zero scripting or production — the quiz itself supplies the entire structure
        of the video. That's a low-effort-to-produce, high-watchability combination platforms tend to reward, which
        is a large part of why this specific format resurfaces so reliably whenever a new short-form platform rises.
      </p>

      <h2>The Zeigarnik effect, applied to a checklist</h2>
      <p>
        A long checklist you've started but not finished creates the same psychological pull toward completion
        described by the Zeigarnik effect — the tendency to keep thinking about and returning to unfinished tasks
        more than completed ones — that shows up in plenty of unrelated contexts, from unfinished puzzles to
        half-read articles. A 100-item list you're partway through is a visible, specific unfinished task, which is
        part of why these tests are unusually hard to abandon halfway — there's a real, well-documented cognitive
        pull toward seeing the number through to a final result rather than closing the tab at item 40, the same
        pull that keeps someone playing "just one more level" or leaves a half-finished puzzle sitting on a table
        for days rather than being put away.
      </p>

      <h2>Nostalgia is doing real work too</h2>
      <p>
        Because the format has circulated for so long across so many platforms, encountering it again — even in a
        completely different app than where you first saw it — carries a specific kind of internet nostalgia for
        anyone who's taken a version of it before. Familiarity itself is part of the appeal: it's less "discovering
        something new" and more "revisiting a slightly different version of something you already know," which
        lowers the barrier to actually clicking into it compared to trying an entirely unfamiliar quiz format.
      </p>

      <h2>A format that has to be rebuilt carefully, not just copied</h2>
      <p>
        Because the format has circulated informally for so long across so many sites, the actual content of any
        given version varies enormously in tone and appropriateness — plenty of versions floating around lean into
        explicit or shock-value content specifically to drive shares. That's a real design choice, not an
        unavoidable feature of the format itself: a checklist about ordinary life experiences (travel, social
        mishaps, growing-up milestones, harmless mischief) creates the exact same comparison mechanic and the exact
        same shareability without needing anything explicit to work. The mechanism that makes this format spread —
        a comparable number, generated from a personal checklist — doesn't depend on edgy content; it depends on
        the checklist covering things a wide range of people can honestly relate to either way.
      </p>

      <h2>What actually keeps it from feeling mean-spirited</h2>
      <p>
        A checklist like this could easily read as judgmental, and the versions that succeed generally avoid that by
        keeping the framing playful rather than evaluative — a shared joke about how much living you've packed in,
        not a moral scorecard. That's a deliberate design choice worth being explicit about: a purity test that
        implies a "good" or "bad" number tends to feel uncomfortable rather than fun, while one that treats every
        result as an equally valid, equally amusing outcome keeps the whole thing feeling like a game rather than a
        judgment. The tiers and blurbs on the version we built were written with exactly that in mind — every result
        from top to bottom gets a lighthearted label, not a value judgment.
      </p>

      <h2>Why the group setting matters as much as the format</h2>
      <p>
        Much like the reciprocity dynamic behind Truth or Dare, a purity test rarely stays a solo activity for long
        — the natural next step after finishing is showing someone else and asking what they got. That comparison
        moment is really where the social value lives; the quiz itself is mostly a mechanism for generating a number
        worth comparing, and the actual fun tends to happen in the conversation that follows ("wait, you haven't
        done that either?") rather than in the act of clicking checkboxes alone. In that sense the checklist itself
        is almost incidental — a well-designed excuse to have a specific kind of conversation people already enjoy
        having.
      </p>
      <p>
        This also explains the format's seasonal spikes — interest in these quizzes tends to surge around specific
        group-gathering moments like the start of a school year or a holiday break, exactly when groups of friends
        who haven't seen each other in a while are looking for a low-effort way to catch up and compare notes on
        what's changed. The format isn't just tolerant of group settings; it's specifically well-suited to the kind
        of reunion conversation people are already having anyway, just giving it some structure.
      </p>

      <h2>Try it yourself</h2>
      <p>
        Our <Link to="/tools/purity-test">Purity Test</Link> uses an entirely original 100-statement checklist
        across seven categories, split into short sections so it never feels like one overwhelming list, with a
        shareable result card built for exactly the comparison moment described above. Every result, from the
        highest score to the lowest, is written to be equally worth a laugh rather than a judgment — the format
        works best, and stays fun longest, when nobody's score feels like a verdict.
      </p>

      <div className="mt-6">
        <Link
          to="/tools/purity-test"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold !text-primary-foreground !no-underline transition hover:opacity-90"
        >
          Take the Purity Test <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </BlogPostLayout>
  );
}
