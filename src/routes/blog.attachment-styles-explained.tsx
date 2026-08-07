import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";

const post = getBlogPostBySlug("attachment-styles-explained")!;

export const Route = createFileRoute("/blog/attachment-styles-explained")({
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
        "Attachment style" gets thrown around online as shorthand for basically any relationship pattern — clingy,
        distant, complicated. The actual research behind the term is more specific and, honestly, more useful than the
        internet-shorthand version suggests. Knowing where it came from and what it's actually describing makes the four
        styles far more useful than treating them as personality horoscope categories, and it also makes clear why the
        label is a starting point for reflection rather than a fixed diagnosis.
      </p>

      <h2>Where the theory actually comes from</h2>
      <p>
        Attachment theory originates with psychiatrist John Bowlby, who in the mid-20th century proposed that infants
        are biologically wired to form a strong bond with a primary caregiver, and that the quality of that early bond
        shapes how a person expects relationships to work later on. Psychologist Mary Ainsworth built on this with a
        famous study called the "Strange Situation," where researchers observed how infants reacted when briefly
        separated from and then reunited with a caregiver. Different, consistent patterns of reaction — some infants
        were easily soothed on reunion, others stayed distressed, others seemed to actively avoid the caregiver — became
        the original basis for classifying attachment patterns. Decades later, researchers Cindy Hazan and Phillip
        Shaver extended the framework to adult romantic relationships, and psychologist Kim Bartholomew later refined it
        into the four-category model most commonly used today.
      </p>

      <h2>The four styles, described accurately</h2>
      <p>
        <strong>Secure attachment</strong> describes people who are generally comfortable with both closeness and
        independence — able to trust a partner, communicate needs directly, and handle conflict without either shutting
        down or panicking. <strong>Anxious (anxious-preoccupied) attachment</strong> tends to involve a strong desire
        for closeness paired with a persistent fear of abandonment or not being loved enough, which can show up as
        needing frequent reassurance or reading too much into a partner's silence.{" "}
        <strong>Avoidant (dismissive-avoidant) attachment</strong> tends to involve valuing independence and
        self-sufficiency to the point of discomfort with too much closeness, often pulling back when a relationship
        starts to feel too intense or demanding. <strong>Fearful-avoidant (disorganized) attachment</strong> combines
        elements of both — wanting closeness while also fearing it, sometimes leading to a push-pull pattern of pursuing
        connection and then retreating from it.
      </p>

      <h2>How each style tends to show up during conflict</h2>
      <p>
        Attachment patterns are often easiest to spot not in calm moments but during disagreement, when the underlying
        strategy each style relies on becomes visible. Anxious attachment is associated with what researchers sometimes
        call protest behavior — pursuing, calling repeatedly, or escalating to get a response, driven by the fear that
        distance means the relationship is actually ending. Avoidant attachment is associated with deactivating
        strategies — withdrawing, going quiet, or focusing on a partner's flaws to create emotional distance when things
        feel too close. Secure attachment tends to look like staying present during the disagreement itself: stating
        what's wrong directly, without escalating to get attention or shutting down to create space. Recognizing your
        own default reflex under stress is often more immediately useful than the style label itself, because it's the
        specific behavior you can actually choose to interrupt in the moment.
      </p>

      <h2>What actually causes an attachment style</h2>
      <p>
        Early caregiving consistency is the original and most-studied factor: caregivers who reliably responded to an
        infant's needs tended to produce more securely attached children in Ainsworth's research, while inconsistent,
        dismissive, or frightening caregiving was associated with the other patterns. But attachment research today
        generally treats this as one significant influence among several, not a single deterministic cause —
        temperament, later relationships, and significant life experiences all continue to shape attachment patterns
        well beyond early childhood. It's a starting point that gets built on, not a sentence handed down in infancy.
      </p>
      <p>
        This matters for how you interpret your own results: if a style shows up strongly, it says something real about
        patterns that formed over time, but it doesn't point to a single identifiable cause you can locate and blame.
        Multiple contributing factors overlapping is the norm, not the exception, which is part of why attachment work
        in therapy tends to focus on current patterns and how to shift them, rather than trying to pinpoint one
        originating event.
      </p>

      <h2>The part most casual explanations leave out</h2>
      <p>
        This is the detail that matters most and gets dropped most often: attachment style is a pattern, not a permanent
        identity, and it's measured on a continuum rather than as four hard boxes — most people lean toward one style
        while still showing some traits of others, and the "purest" form of any single style is relatively uncommon.
        Research on attachment also finds it isn't perfectly fixed for life. The concept of "earned secure attachment"
        describes people who didn't start with a secure pattern but developed one over time, often through a stable
        relationship, therapy, or sustained self-awareness work. Attachment style describes a tendency your nervous
        system defaults to under stress, not an unchangeable trait carved into who you are.
      </p>

      <h2>Two myths worth retiring</h2>
      <p>
        <strong>"Anxious and avoidant partners are always a toxic combination."</strong> It's true that an anxious
        partner's pursuit and an avoidant partner's withdrawal can reinforce each other in an unhelpful cycle, but
        plenty of anxious-avoidant pairings build genuinely stable, secure relationships — awareness of the pattern, not
        the pattern's mere existence, is what determines the outcome.{" "}
        <strong>"You can self-diagnose your attachment style with total accuracy from a quiz."</strong> Self-report
        questionnaires (including the one below) are useful reflection tools, but people aren't always accurate
        observers of their own patterns, especially under stress — which is exactly why the field distinguishes
        self-reported style from style assessed through structured interviews or behavioral observation in actual
        research settings.
      </p>
      <p>
        <strong>"Avoidant means you don't care."</strong> This one gets it backwards. Avoidant attachment is generally
        understood as a strategy for managing closeness, not an absence of feeling — the withdrawal is typically a
        response to discomfort with intensity or vulnerability, not a lack of investment in the relationship. Reading
        avoidant behavior as indifference is one of the more common and more damaging misreadings of the pattern.
      </p>

      <h2>Why it can look different in different relationships</h2>
      <p>
        Attachment researchers increasingly distinguish between a general attachment orientation and attachment behavior
        in a specific relationship — the same person can behave more anxiously with one partner and more securely with
        another, depending on how safe and consistent that particular relationship feels. This is why two people can
        take the same self-report questionnaire and describe their patterns differently depending on which relationship
        they were thinking about while answering. A style isn't purely an internal trait independent of context — it
        interacts with who you're with and how that relationship actually behaves toward you.
      </p>
      <p>
        This is also why a relationship with a securely attached partner can gradually shift someone's own patterns over
        time — consistent, predictable responsiveness from a partner functions similarly to what a consistent caregiver
        provided in childhood, giving the nervous system repeated evidence that closeness doesn't have to come with the
        fear or disappointment it may have been paired with before.
      </p>

      <h2>What knowing your style is actually useful for</h2>
      <p>
        The practical value isn't the label itself — it's what the label points you toward. Recognizing an anxious
        pattern can help you notice when you're seeking reassurance in a way that's about old fear rather than the
        current relationship. Recognizing an avoidant pattern can help you notice when you're creating distance out of
        habit rather than genuine need for space. None of this is a diagnosis, and a short quiz — including ours — is a
        self-reflection tool and a conversation starter, not a clinical assessment. If attachment patterns are causing
        real distress in your relationships, a therapist trained in attachment-based approaches can go much deeper than
        any online quiz.
      </p>

      <h2>What a secure relationship actually looks like in practice</h2>
      <p>
        Security isn't the absence of conflict or need — it's a specific set of behaviors that show up under stress:
        stating what's bothering you directly instead of testing a partner, tolerating some distance without assuming it
        means rejection, and staying emotionally present during disagreement instead of escalating or withdrawing. None
        of these are personality traits you either have or don't — they're behaviors that can be practiced deliberately,
        which is exactly how earned secure attachment tends to develop in practice: not as a sudden shift, but as a
        gradual habit built through repeated, smaller choices in real relationships.
      </p>

      <p>
        Our <Link to="/tools/attachment-style-test">Attachment Style Test</Link> walks through the four patterns above
        with a short set of questions and gives you a breakdown of where you lean — a starting point for reflection, not
        a permanent label.
      </p>

      <div className="mt-6">
        <Link
          to="/tools/attachment-style-test"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold !text-primary-foreground !no-underline transition hover:opacity-90"
        >
          Take the Attachment Style Test <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </BlogPostLayout>
  );
}
