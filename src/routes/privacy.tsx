import { createFileRoute, Link } from "@tanstack/react-router";
import { buildPageMeta } from "@/lib/seo";

const articleClass =
  "max-w-none text-foreground/90 " +
  "[&_h2]:font-display [&_h2]:tracking-tight [&_h2]:text-2xl sm:[&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-foreground " +
  "[&_h3]:font-display [&_h3]:tracking-tight [&_h3]:text-xl sm:[&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-foreground " +
  "[&_p]:my-5 [&_p]:leading-[1.8] " +
  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-5 [&_ol]:space-y-2 " +
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ul]:space-y-2 " +
  "[&_li]:leading-[1.8] [&_li>ul]:my-2 " +
  "[&_strong]:font-semibold [&_strong]:text-foreground " +
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80";

export const Route = createFileRoute("/privacy")({
  head: () =>
    buildPageMeta({
      title: "Privacy Policy — Skycally",
      description:
        "How Skycally collects, uses, and protects information when you use our free online tools. Most tools run entirely in your browser.",
      path: "/privacy",
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-12 text-[16px] leading-[1.8]">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: May 16, 2026</p>
      </header>

      <article className={articleClass}>
        <h2>Introduction</h2>
        <p>
          Skycally ("we", "us", or "our") operates skycally.com. This Privacy Policy explains how we collect, use, and protect information when you use our website and tools.
        </p>

        <h2>Information We Collect</h2>

        <h3>Information You Provide</h3>
        <p>
          We do not require you to create an account or provide personal information to use Skycally tools. If you contact us via our contact form, we collect your name and email address solely to respond to your inquiry.
        </p>

        <h3>Automatically Collected Information</h3>
        <p>When you visit Skycally, we automatically collect certain information including:</p>
        <ul>
          <li>Browser type and version</li>
          <li>Operating system</li>
          <li>Pages visited and time spent</li>
          <li>Referring website</li>
          <li>IP address (anonymized)</li>
        </ul>
        <p>
          This data is collected via Google Analytics to help us understand how visitors use our site. We do not sell or share this data with third parties.
        </p>

        <h2>How We Use Your Files</h2>
        <p>
          Most Skycally tools run entirely in your browser using client-side processing. This means your files are never uploaded to our servers. Tools that require server-side processing (such as Audio Converter, Video Downloader, and Remove Background) transmit your files securely to our processing server solely for the purpose of completing the requested operation. Files are deleted immediately after processing and are never stored, shared, or accessed by anyone.
        </p>

        <h2>Cookies</h2>
        <p>We use cookies for the following purposes:</p>

        <h3>Analytics Cookies</h3>
        <p>
          We use Google Analytics to collect anonymous usage data. These cookies help us understand which tools are most popular and how to improve our service. You can opt out of Google Analytics by installing the Google Analytics Opt-out Browser Add-on.
        </p>

        <h3>Advertising Cookies</h3>
        <p>
          We may display advertisements provided by third-party advertising networks including Google AdSense and Media.net. These networks may use cookies to serve ads based on your prior visits to our website or other websites. You can opt out of personalized advertising by visiting Google's Ad Settings or the Network Advertising Initiative opt-out page.
        </p>

        <h2>Third-Party Services</h2>
        <p>Skycally uses the following third-party services:</p>
        <ul>
          <li><strong>Google Analytics</strong> — website usage analytics</li>
          <li><strong>Google AdSense / Media.net</strong> — advertising</li>
          <li><strong>Cloudflare</strong> — content delivery and security</li>
          <li><strong>Railway</strong> — server-side processing infrastructure</li>
        </ul>
        <p>Each of these services has its own privacy policy governing the use of your data.</p>

        <h2>Data Security</h2>
        <p>
          We implement appropriate technical measures to protect against unauthorized access to our systems. However, no method of transmission over the internet is 100% secure.
        </p>

        <h2>Children's Privacy</h2>
        <p>
          Skycally is not directed at children under the age of 13. We do not knowingly collect personal information from children.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date.
        </p>

        <h2>Contact Us</h2>
        <p>If you have questions about this Privacy Policy, please contact us at:</p>
        <p>
          Email: <a href="mailto:hello@skycally.com">hello@skycally.com</a>
          <br />
          Website: <Link to="/contact">skycally.com/contact</Link>
        </p>
      </article>
    </div>
  );
}
