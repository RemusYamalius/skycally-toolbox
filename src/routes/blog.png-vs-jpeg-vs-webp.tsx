import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";

const post = getBlogPostBySlug("png-vs-jpeg-vs-webp")!;

export const Route = createFileRoute("/blog/png-vs-jpeg-vs-webp")({
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
        "Just use WebP for everything" is close to right but not quite complete, and "PNG is for graphics, JPEG is
        for photos" is the old rule of thumb that still mostly holds but misses why. The actual answer depends on
        one core distinction — lossless versus lossy compression — and a couple of practical details that decide
        which format wins for a specific image, along with a couple of situations where the old formats still make
        more sense than the newer ones.
      </p>

      <h2>The one distinction that explains everything else</h2>
      <p>
        PNG is a lossless format: it compresses a file without discarding any image data, so decompressing it gives
        you back pixel-for-pixel exactly what went in. JPEG is a lossy format: it discards some image detail — detail
        it's betting your eye won't notice — to achieve a much smaller file size. This single difference explains
        almost every practical decision between the two. Lossless is the right choice when exact pixel accuracy
        matters — text, sharp logo edges, screenshots with fine UI detail. Lossy is the right choice when a small
        amount of imperceptible quality loss is a fair trade for a dramatically smaller file, which describes most
        photographs.
      </p>

      <h2>Why PNG files get so large</h2>
      <p>
        Because PNG can't throw anything away, it has to compress purely through smarter encoding of the exact data
        present — and photographs are the worst case for this. A photo has continuous, gradual variation in color
        across millions of pixels with no large flat areas to compress efficiently, so a losslessly-compressed photo
        stays large no matter how good the compression algorithm is. A screenshot or a logo, by contrast, often has
        huge flat regions of a single color, which lossless compression handles extremely well. This is the real
        reason "PNG for graphics, JPEG for photos" became the standard advice — it's not an arbitrary convention,
        it's a direct consequence of what each format's compression approach is actually good at.
      </p>

      <h2>What transparency actually requires</h2>
      <p>
        PNG supports an alpha channel — per-pixel transparency, letting part of an image be fully see-through or
        partially blended with whatever's behind it. Standard JPEG has no transparency support at all; a JPEG is
        always a fully opaque rectangle. This is often the deciding factor by itself: a logo that needs to sit on
        different colored backgrounds, or a UI icon that needs to blend into a page, has to be PNG (or WebP) —
        JPEG isn't a valid option no matter how good its compression is for that use case.
      </p>

      <h2>Where WebP actually improves on both</h2>
      <p>
        WebP, developed by Google, supports both lossless and lossy compression in the same format — meaning it can
        directly replace either PNG or JPEG depending on which mode you use, rather than being a third, separate
        category. In lossy mode, WebP images are commonly reported to run roughly 25-35% smaller than a JPEG at
        similar visual quality. In lossless mode, WebP files tend to run meaningfully smaller than an equivalent
        PNG as well. It also supports transparency (matching PNG's capability) and animation (functionally replacing
        animated GIF, at dramatically better compression). Browser support is no longer a real obstacle — every
        major browser, including Safari since 2020, renders WebP natively, which was the main practical reason to
        avoid it for years and largely isn't anymore.
      </p>

      <h2>The specific cases where WebP isn't the automatic winner</h2>
      <p>
        A handful of situations still favor the older formats. If an image needs to be edited repeatedly and
        re-exported many times, PNG's lossless guarantee avoids the "generation loss" problem lossy formats have,
        where each re-save of a lossy file compounds a little more quality loss on top of the last — WebP in lossy
        mode has this same issue, and PNG's lossless mode sidesteps it entirely. JPEG still has the widest possible
        compatibility with very old software and hardware that may not recognize WebP at all, which occasionally
        matters for archival or specialized industrial use. And for extremely simple images — a few flat colors,
        like a basic icon — PNG and WebP file sizes can end up close enough that the difference isn't worth
        optimizing for. Software compatibility is also worth a quick check on your own end: some older design and
        editing tools still handle WebP less gracefully on import/export than PNG or JPEG, which occasionally makes
        PNG the more practical working format during editing even when WebP is the better final export.
      </p>

      <h2>Where these formats actually came from</h2>
      <p>
        JPEG dates back to 1992, standardized by the Joint Photographic Experts Group specifically to compress
        photographic images for a world with far less storage and bandwidth than today. PNG arrived in 1996,
        created largely as a free, patent-unencumbered alternative to GIF after a licensing dispute over GIF's
        compression algorithm made developers nervous about using it — PNG was designed from the start to handle
        lossless compression and transparency properly, which GIF only did in a limited, 256-color way. WebP is
        far newer, introduced by Google in 2010, built specifically to address a problem neither older format
        solved: modern photos and graphics both needed a format that compressed meaningfully better than 1990s-era
        JPEG and PNG without giving up quality or transparency support.
      </p>

      <h2>Why this actually matters for a website, not just file size</h2>
      <p>
        Image weight is very often the single largest contributor to how long a web page takes to load, which
        directly affects Core Web Vitals metrics like Largest Contentful Paint — a page-speed factor Google
        explicitly uses as a search ranking signal. Switching a page's images from JPEG/PNG to WebP is one of the
        highest-leverage, lowest-effort performance improvements available for most websites, precisely because it
        requires no design change at all — the image looks the same, just weighs less. This is why image format
        choice shows up so often in web performance audits: it's rarely the most visible fix, but it's consistently
        one of the most impactful ones per hour of effort spent.
      </p>

      <h2>What about AVIF?</h2>
      <p>
        AVIF is a newer image format based on the AV1 video codec, and in most comparisons it compresses even more
        efficiently than WebP at equivalent visual quality — often meaningfully smaller for photographic content
        specifically. The tradeoff is encoding speed (AVIF encoding is generally slower and more computationally
        expensive) and slightly less universal software support than WebP has at this point, though that gap
        continues to close. For a straightforward practical rule: WebP is the safe, broadly compatible default
        upgrade from PNG or JPEG today, and AVIF is worth using specifically when squeezing out the last bit of file
        size matters more than encoding simplicity or maximum compatibility. For a personal blog or portfolio site,
        that tradeoff usually isn't worth chasing; for a large image-heavy platform serving millions of page views,
        even a small additional percentage of savings compounds into real bandwidth cost, which is why bigger sites
        are more often the ones investing in AVIF specifically.
      </p>

      <h2>A simple decision guide</h2>
      <p>
        Need transparency, or is the image mostly flat colors, text, or sharp UI elements? Use PNG, or WebP in
        lossless mode for a smaller file with the same guarantees. Is it a photograph, and is some imperceptible
        quality loss an acceptable trade for a much smaller file? Use JPEG, or WebP in lossy mode for a further
        size reduction at the same visual quality. Building for the modern web with no unusual compatibility
        constraints? Default to WebP for nearly everything, and reach for AVIF specifically on photo-heavy pages
        where every extra kilobyte of load time matters.
      </p>

      <h2>One more thing worth checking before you convert</h2>
      <p>
        Converting a lossy image to a different lossy format doesn't undo quality already lost in the original —
        converting a heavily-compressed JPEG to WebP won't recover detail that JPEG's compression already discarded,
        it'll just re-encode the already-degraded image more efficiently. For the best result, convert from the
        highest-quality source you actually have (ideally an original PNG or an unedited high-quality JPEG) rather
        than re-compressing a file that's already been through lossy compression once. If you only have the
        already-compressed version, converting it is still usually worth doing for the file-size win — just don't
        expect quality to improve along with it. When in doubt, keep the original source file around even after
        converting, in case you need to re-export at a different quality level later.
      </p>

      <p>
        Our <Link to="/tools/image-converter">Image Converter</Link> handles all four formats — PNG, JPG, WebP, and
        AVIF — so you can test the same image across formats and compare file sizes directly instead of guessing.
        If you just need a smaller file in the same format, the <Link to="/tools/image-compressor">Image
        Compressor</Link> does that without a format change.
      </p>

      <div className="mt-6">
        <Link
          to="/tools/image-converter"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold !text-primary-foreground !no-underline transition hover:opacity-90"
        >
          Try the Image Converter <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </BlogPostLayout>
  );
}
