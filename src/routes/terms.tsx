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

export const Route = createFileRoute("/terms")({
  head: () =>
    buildPageMeta({
      title: "Terms of Service — Skycally",
      description:
        "Terms governing your use of Skycally's free, browser-based online tools for images, video, audio, and PDFs.",
      path: "/terms",
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-12 text-[16px] leading-[1.8]">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: May 16, 2026</p>
      </header>

      <article className={articleClass}>
        <h2>Acceptance of Terms</h2>
        <p>
          By accessing or using Skycally (skycally.com), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our website.
        </p>

        <h2>Description of Service</h2>
        <p>
          Skycally provides a collection of free, browser-based online tools for processing images, videos, PDFs, audio files, and other digital content. Most tools run entirely in your browser with no file uploads required.
        </p>

        <h2>Permitted Use</h2>
        <p>You may use Skycally tools for personal, educational, and commercial purposes, provided that you:</p>
        <ul>
          <li>Only process files and content that you own or have the legal right to use</li>
          <li>Do not use our tools to process illegal, harmful, or infringing content</li>
          <li>Do not attempt to reverse-engineer, copy, or redistribute our tools or platform</li>
          <li>Do not use automated scripts or bots to access our services in a way that disrupts normal operations</li>
        </ul>

        <h2>Intellectual Property</h2>
        <p>
          All content on Skycally, including but not limited to the website design, logo, tool interfaces, and written content, is the property of Skycally and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
        </p>

        <h2>User Content</h2>
        <p>
          When you use Skycally tools that involve file processing, you retain full ownership of your files. We do not claim any rights over files you process using our tools. For server-side tools, files are transmitted securely and deleted immediately after processing.
        </p>

        <h2>Advertising</h2>
        <p>
          Skycally displays advertisements provided by third-party networks. We are not responsible for the content of advertisements displayed on our site. Clicking on advertisements may take you to third-party websites governed by their own terms and privacy policies.
        </p>

        <h2>Disclaimer of Warranties</h2>
        <p>
          Skycally is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of viruses or other harmful components. We do not guarantee the accuracy or completeness of any results produced by our tools.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Skycally and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, the service — including but not limited to loss of data, loss of profits, or business interruption.
        </p>

        <h2>Third-Party Links</h2>
        <p>
          Skycally may contain links to third-party websites. We are not responsible for the content, privacy practices, or terms of those websites.
        </p>

        <h2>Modifications to Service</h2>
        <p>
          We reserve the right to modify, suspend, or discontinue any part of Skycally at any time without notice. We are not liable to you or any third party for any such modification, suspension, or discontinuation.
        </p>

        <h2>Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
        </p>

        <h2>Changes to Terms</h2>
        <p>
          We may update these Terms of Service from time to time. Continued use of Skycally after changes are posted constitutes your acceptance of the revised terms.
        </p>

        <h2>Contact Us</h2>
        <p>If you have questions about these Terms of Service, please contact us at:</p>
        <p>
          Email: <a href="mailto:hello@skycally.com">hello@skycally.com</a>
          <br />
          Website: <Link to="/contact">skycally.com/contact</Link>
        </p>
      </article>
    </div>
  );
}
