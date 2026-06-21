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
        "Skycally's Privacy Policy. Learn how we handle your data, files, and browser information. Most tools run entirely in your browser — your files never leave your device.",
      path: "/privacy",
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-12 text-[16px] leading-[1.8]">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">Privacy Policy</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: June 21, 2026</p>
      </header>

      <article className={articleClass}>
        <h2>Overview</h2>
        <p>
          Skycally ("we", "us", or "our") operates skycally.com, a collection of free browser-based online tools. We are
          committed to protecting your privacy. The short version:{" "}
          <strong>most tools process your files entirely in your browser — your files never reach our servers.</strong>{" "}
          This policy explains in full what data we collect, why, and how.
        </p>

        <h2>1. Files and Documents</h2>

        <h3>Client-side tools (the vast majority)</h3>
        <p>
          The majority of Skycally tools — including Image Compressor, Image Converter, PDF tools, Word Counter,
          Password Generator, Loan Calculator, Compound Interest Calculator, Document Scanner, and all game tools — run
          entirely in your browser using JavaScript and WebAssembly.{" "}
          <strong>Your files, images, and documents are never transmitted to any server.</strong> Processing happens
          locally on your device and stops when you close the tab.
        </p>

        <h3>Server-side tools</h3>
        <p>
          A small number of tools require server-side processing (currently Audio Converter and Video Downloader). When
          you use these tools, your files are transmitted securely over HTTPS to our processing server hosted on
          Railway. Files are processed immediately and <strong>deleted automatically within seconds</strong> of the
          operation completing. They are never stored, indexed, shared, or accessed by any person.
        </p>

        <h2>2. Information We Collect Automatically</h2>
        <p>When you visit Skycally, we automatically collect standard web analytics data including:</p>
        <ul>
          <li>Browser type and version</li>
          <li>Operating system</li>
          <li>Pages visited and time spent on each page</li>
          <li>Referring website or search query</li>
          <li>Country-level location (derived from IP address, not stored directly)</li>
          <li>Device type (desktop, mobile, tablet)</li>
        </ul>
        <p>
          This data is collected via <strong>Google Analytics</strong> and is used exclusively to understand which tools
          are most useful and how to improve the site. We do not sell, rent, or share this data with any third party for
          commercial purposes.
        </p>

        <h2>3. Local Storage</h2>
        <p>
          Several Skycally tools save your preferences or last-used values in your browser's{" "}
          <strong>localStorage</strong> to improve your experience. For example, the Loan Calculator saves your last
          inputs so they are restored on your next visit. This data is stored only on your device and is never
          transmitted to us. You can clear it at any time by clearing your browser's site data for skycally.com.
        </p>

        <h2>4. Information You Provide</h2>
        <p>
          We do not require you to create an account to use any Skycally tool. If you contact us via the contact form,
          we collect your name and email address solely to respond to your inquiry. This information is not used for
          marketing and is not shared with third parties.
        </p>

        <h2>5. Cookies</h2>

        <h3>Analytics cookies</h3>
        <p>
          We use Google Analytics cookies to collect anonymous, aggregated usage data. You can opt out by installing the{" "}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
            Google Analytics Opt-out Browser Add-on
          </a>
          .
        </p>

        <h3>Advertising cookies</h3>
        <p>
          We display advertisements served by third-party networks including Google AdSense and Media.net. These
          networks may place cookies to serve ads relevant to your interests based on your browsing history. You can
          manage ad personalization at{" "}
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
            Google Ad Settings
          </a>{" "}
          or the{" "}
          <a href="https://optout.networkadvertising.org" target="_blank" rel="noopener noreferrer">
            Network Advertising Initiative opt-out page
          </a>
          .
        </p>

        <h2>6. Third-Party Services</h2>
        <p>Skycally integrates with the following third-party services, each governed by its own privacy policy:</p>
        <ul>
          <li>
            <strong>Google Analytics</strong> — website usage analytics (
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            )
          </li>
          <li>
            <strong>Google AdSense</strong> — advertising (
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            )
          </li>
          <li>
            <strong>Media.net</strong> — advertising
          </li>
          <li>
            <strong>Cloudflare</strong> — content delivery network and DDoS protection
          </li>
          <li>
            <strong>Railway</strong> — server infrastructure for server-side tools
          </li>
          <li>
            <strong>Frankfurter API</strong> — exchange rate data for Currency Converter (no personal data transmitted)
          </li>
        </ul>

        <h2>7. GDPR and EEA Users</h2>
        <p>
          If you are located in the European Economic Area (EEA), you have the following rights under the General Data
          Protection Regulation (GDPR):
        </p>
        <ul>
          <li>
            <strong>Right of access</strong> — request a copy of the data we hold about you
          </li>
          <li>
            <strong>Right to rectification</strong> — request correction of inaccurate data
          </li>
          <li>
            <strong>Right to erasure</strong> — request deletion of your data
          </li>
          <li>
            <strong>Right to object</strong> — object to processing of your data for analytics or advertising
          </li>
          <li>
            <strong>Right to data portability</strong> — receive your data in a portable format
          </li>
        </ul>
        <p>
          Our legal basis for processing analytics data is <strong>legitimate interest</strong> (understanding and
          improving our service). For advertising cookies, the legal basis is <strong>consent</strong>. To exercise any
          GDPR right, contact us at <a href="mailto:hello@skycally.com">hello@skycally.com</a>.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          Skycally is not directed at children under the age of 13. We do not knowingly collect personal information
          from children. If you believe a child has provided us with personal information, please contact us and we will
          delete it promptly.
        </p>

        <h2>9. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect against unauthorized access to our
          systems. All data transmitted between your browser and our servers is encrypted via HTTPS/TLS. However, no
          method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices or for legal,
          operational, or regulatory reasons. We will post the updated policy on this page with a revised "Last updated"
          date. For significant changes, we will add a notice to our homepage.
        </p>

        <h2>11. Contact Us</h2>
        <p>If you have questions, requests, or concerns about this Privacy Policy or your data, please contact us:</p>
        <p>
          Email: <a href="mailto:hello@skycally.com">hello@skycally.com</a>
          <br />
          Website: <Link to="/contact">skycally.com/contact</Link>
        </p>
      </article>
    </div>
  );
}
