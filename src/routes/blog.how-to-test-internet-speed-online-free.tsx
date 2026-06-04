import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { getBlogPostBySlug } from "@/lib/blog";
import { buildPageMeta } from "@/lib/seo";
import networkSpeedTestThumb from "@/assets/blog-network-speed-test.png";

const post = getBlogPostBySlug("how-to-test-internet-speed-online-free")!;

export const Route = createFileRoute("/blog/how-to-test-internet-speed-online-free")({
  head: () => {
    const base = buildPageMeta({
      title: post.title,
      description: post.description,
      path: post.path,
    });
    return {
      ...base,
      meta: [...base.meta, { property: "og:type", content: "article" }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "datePublished": post.date,
          "dateModified": post.date,
          "author": {
            "@type": "Organization",
            "name": "Skycally",
            "url": "https://skycally.com",
          },
          "publisher": {
            "@type": "Organization",
            "name": "Skycally",
            "url": "https://skycally.com",
            "logo": {
              "@type": "ImageObject",
              "url": "https://skycally.com/favicon.ico",
            },
          },
          "url": `https://skycally.com${post.path}`,
          "description": post.description,
        }),
      }],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  return (
    <BlogPostLayout post={post}>
      <p>
        Slow Wi-Fi at the worst possible moment? Before you blame your ISP, run a quick speed test. A good test tells you exactly what's happening on your connection — download speed, upload speed, ping, and jitter — in about 15 seconds. No apps, no signup, no excuses.
      </p>

      <h2>What Is an Internet Speed Test?</h2>
      <p>
        An internet speed test measures how fast your connection can move data between your device and the internet. A good test reports four numbers, and each one means something different:
      </p>
      <ul>
        <li>
          <strong>Download speed</strong> — how fast data comes <em>to</em> your device, measured in Mbps. Affects streaming, browsing, and downloads.
        </li>
        <li>
          <strong>Upload speed</strong> — how fast data leaves your device. Matters for video calls, cloud backups, and posting media.
        </li>
        <li>
          <strong>Ping (latency)</strong> — how long a single round trip takes, in milliseconds. Low ping = snappy, responsive connection.
        </li>
        <li>
          <strong>Jitter</strong> — how much your ping varies over time. High jitter causes choppy video calls and rubber-banding in games.
        </li>
      </ul>

      <h2>Why Your Internet Speed Matters</h2>
      <p>
        Different activities need different amounts of bandwidth. Here's a quick reference for what you actually need:
      </p>
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card">
            <tr>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Activity</th>
              <th className="text-left font-semibold px-4 py-3 border-b border-border">Recommended Speed</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="px-4 py-3 border-b border-border">HD Streaming (1080p)</td><td className="px-4 py-3 border-b border-border">5 Mbps</td></tr>
            <tr><td className="px-4 py-3 border-b border-border">4K Streaming</td><td className="px-4 py-3 border-b border-border">25 Mbps</td></tr>
            <tr><td className="px-4 py-3 border-b border-border">Video Calls (Zoom, Meet)</td><td className="px-4 py-3 border-b border-border">3 Mbps</td></tr>
            <tr><td className="px-4 py-3 border-b border-border">Online Gaming</td><td className="px-4 py-3 border-b border-border">10 Mbps</td></tr>
            <tr><td className="px-4 py-3">Working From Home</td><td className="px-4 py-3">25+ Mbps</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        If your test results are well below the activity you're trying to do, that's your bottleneck right there.
      </p>

      <h2>How to Test Your Speed with Skycally</h2>
      <p>
        Skycally's speed test runs entirely in your browser using Cloudflare's global network. No download, no install, no account.
      </p>
      <ol>
        <li>
          Open <a href="/tools/network-speed-test">Skycally Network Speed Test</a>
        </li>
        <li>
          Click <strong>Run Test</strong>
        </li>
        <li>Wait about 15 seconds while we measure download, upload, ping, and jitter</li>
        <li>Read your results — each metric is shown in its own card with a clear value</li>
      </ol>
      <img
        src={networkSpeedTestThumb}
        alt="Network Speed Test - Skycally"
        className="my-8 w-full rounded-2xl border border-border"
        loading="lazy"
      />

      <h2>Understanding Your Results</h2>
      <p>
        Knowing the numbers is only half the battle — here's what counts as good or bad for each one:
      </p>
      <h3>Download Speed</h3>
      <p>
        <strong>100+ Mbps</strong> is great for most households, even with multiple 4K streams running at once. <strong>25–100 Mbps</strong> is solid for everyday use. <strong>Below 10 Mbps</strong> will struggle with HD streaming and large downloads.
      </p>
      <h3>Upload Speed</h3>
      <p>
        <strong>10+ Mbps</strong> is plenty for video calls, screen sharing, and cloud sync. <strong>Below 3 Mbps</strong> means your camera will look pixelated in meetings and uploads will drag.
      </p>
      <h3>Ping</h3>
      <p>
        <strong>Under 30 ms</strong> is excellent — gaming and video calls will feel instant. <strong>30–100 ms</strong> is fine for most uses. <strong>Above 150 ms</strong> noticeably impacts real-time apps.
      </p>
      <h3>Jitter</h3>
      <p>
        <strong>Under 10 ms</strong> is great. <strong>10–30 ms</strong> is acceptable. <strong>Above 30 ms</strong> means a shaky connection — expect dropped audio in calls and lag spikes in games.
      </p>

      <h2>Tips to Improve Your Internet Speed</h2>
      <p>
        If your numbers look weak, try these in order — most issues clear up before you ever need to call your ISP:
      </p>
      <ol>
        <li>
          <strong>Restart your router and modem.</strong> Unplug both for 30 seconds, then plug them back in. This fixes more problems than you'd think.
        </li>
        <li>
          <strong>Use 5 GHz Wi-Fi or wired Ethernet.</strong> The 2.4 GHz band is slower and crowded; an Ethernet cable beats Wi-Fi every time.
        </li>
        <li>
          <strong>Move closer to your router.</strong> Walls, floors, and distance all kill Wi-Fi signal. Line-of-sight to the router makes a huge difference.
        </li>
        <li>
          <strong>Close bandwidth-heavy apps.</strong> Background uploads, cloud syncs, and other devices streaming 4K will eat your bandwidth.
        </li>
        <li>
          <strong>Upgrade your plan or contact your ISP.</strong> If you consistently measure far below the speeds you're paying for, it's time to call.
        </li>
      </ol>

      <h2>Why Use Skycally's Speed Test?</h2>
      <ul>
        <li><strong>No signup, no apps</strong> — just open the page and click Run Test</li>
        <li><strong>Runs entirely in your browser</strong> — nothing to install, no tracking</li>
        <li><strong>Powered by Cloudflare's global network</strong> for accurate results from a server near you</li>
        <li><strong>Measures ping and jitter</strong>, not just download speed — so you get the full picture</li>
        <li><strong>100% free, with no ads in the test</strong></li>
      </ul>
      <div className="mt-6">
        <Link
          to="/tools/network-speed-test"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold !text-primary-foreground !no-underline transition hover:opacity-90"
        >
          Run a free speed test <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </BlogPostLayout>
  );
}
