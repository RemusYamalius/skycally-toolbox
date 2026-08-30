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
        "Terms of Service for Skycally. Read the rules governing your use of our free online tools for images, video, audio, PDFs, and utilities.",
      path: "/terms",
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-12 text-[16px] leading-[1.8]">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">Terms of Service</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: June 21, 2026</p>
      </header>

      <article className={articleClass}>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Skycally ("the Service", "we", "us", or "our") at skycally.com, you agree to be bound by
          these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service. These
          Terms apply to all visitors, users, and others who access or use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Skycally provides a collection of free, browser-based online tools for processing images, videos, PDFs, audio
          files, text, and other digital content. The Service includes calculators, converters, compressors, editors,
          games, and developer utilities. Most tools run entirely in your browser using JavaScript and WebAssembly, with
          no file uploads required.
        </p>

        <h2>3. Free to Use</h2>
        <p>
          Skycally is free to use for personal, educational, and commercial purposes. We do not charge for access to any
          tool on the platform. We sustain the service through advertising revenue. By using Skycally, you acknowledge
          that advertisements may be displayed.
        </p>

        <h2>4. Permitted Use</h2>
        <p>You may use Skycally tools provided that you:</p>
        <ul>
          <li>Only process files and content that you own or have explicit legal right to use and modify</li>
          <li>
            Do not use our tools to process, distribute, or create illegal, harmful, defamatory, or infringing content
          </li>
          <li>Do not use our tools to circumvent copy protection, DRM, or watermarks on content you do not own</li>
          <li>
            Do not attempt to reverse-engineer, decompile, scrape, or redistribute our tools, platform, or codebase
          </li>
          <li>
            Do not use automated scripts, bots, or crawlers to access our services in a way that disrupts normal
            operations or bypasses rate limits
          </li>
          <li>Do not impersonate Skycally or misrepresent your affiliation with us</li>
        </ul>

        <h2>5. Intellectual Property</h2>
        <p>
          All content on Skycally — including the website design, logo, tool interfaces, written content, and code — is
          the property of Skycally and is protected by applicable intellectual property laws. You may not reproduce,
          distribute, modify, or create derivative works without our express written permission.
        </p>
        <p>
          Open-source libraries used in Skycally (such as Tesseract.js, pdf-lib, pdfjs-dist, and others) remain the
          property of their respective owners and are used in accordance with their respective licenses.
        </p>

        <h2>6. Your Files and Content</h2>
        <p>
          You retain full ownership of all files and content you process using Skycally tools. We do not claim any
          rights over your files. For browser-side tools, your files never leave your device. For server-side tools,
          files are transmitted securely and deleted immediately after processing — they are never stored, shared, or
          reviewed.
        </p>
        <p>
          You are solely responsible for ensuring you have the legal right to process any file or content using our
          tools. You must not use our tools to process files that infringe on the intellectual property rights, privacy
          rights, or other legal rights of any third party.
        </p>

        <h2>7. Financial and Medical Tools</h2>
        <p>
          Calculators and tools on Skycally that relate to financial matters (such as Loan Calculator, Compound Interest
          Calculator, BMI Calculator, and Sleep Calculator) are provided for{" "}
          <strong>informational and educational purposes only</strong>. Results are mathematical estimates and should
          not be construed as financial, investment, medical, or professional advice. Always consult a qualified
          professional before making financial or health-related decisions.
        </p>

        <h2>8. Advertising</h2>
        <p>
          Skycally displays advertisements provided by third-party networks including Google AdSense and Media.net. We
          are not responsible for the content, accuracy, or practices of advertisers. Clicking on an advertisement may
          take you to a third-party website governed by its own terms and privacy policy. We do not endorse any
          advertised products or services.
        </p>

        <h2>9. Third-Party Links and Services</h2>
        <p>
          Skycally may contain links to third-party websites or rely on third-party APIs (such as exchange rate data
          providers). We are not responsible for the content, availability, privacy practices, or terms of those
          websites or services. Your use of any third-party service is subject to that service's own terms.
        </p>

        <h2>10. Disclaimer of Warranties</h2>
        <p>
          The Service is provided "as is" and "as available" without warranties of any kind, either express or implied,
          including but not limited to warranties of merchantability, fitness for a particular purpose, or
          non-infringement. We do not warrant that:
        </p>
        <ul>
          <li>The Service will be uninterrupted, error-free, or available at all times</li>
          <li>Results produced by our tools will be accurate, complete, or fit for any particular purpose</li>
          <li>The Service is free from viruses, malware, or other harmful components</li>
          <li>Any errors will be corrected</li>
        </ul>

        <h2>11. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by applicable law, Skycally and its operators shall not be liable for any
          indirect, incidental, special, consequential, exemplary, or punitive damages arising from:
        </p>
        <ul>
          <li>Your use of, or inability to use, the Service</li>
          <li>Loss or corruption of data or files</li>
          <li>Loss of profits, revenue, or business opportunities</li>
          <li>Unauthorized access to or alteration of your transmissions or data</li>
          <li>Any other matter relating to the Service</li>
        </ul>
        <p>
          In no event shall our total liability to you exceed the amount you paid us in the twelve months preceding the
          claim (which, as the Service is free, shall be zero).
        </p>

        <h2>12. Modifications to Service</h2>
        <p>
          We reserve the right to modify, suspend, or discontinue any part of Skycally at any time and without prior
          notice. We are not liable to you or any third party for any modification, suspension, price change, or
          discontinuation of the Service.
        </p>

        <h2>13. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising under
          these Terms shall be subject to the exclusive jurisdiction of the competent courts in the jurisdiction where
          Skycally operates, unless otherwise required by local consumer protection law.
        </p>

        <h2>14. Changes to Terms</h2>
        <p>
          We may update these Terms of Service from time to time. When we do, we will update the "Last updated" date
          above. Continued use of Skycally after changes are posted constitutes your acceptance of the revised Terms. We
          encourage you to review this page periodically.
        </p>

        <h2>15. Contact Us</h2>
        <p>If you have questions or concerns about these Terms of Service, please contact us:</p>
        <p>
          Email: <a href="mailto:contact@skycally.com">contact@skycally.com</a>
          <br />
          Website: <Link to="/contact">skycally.com/contact</Link>
        </p>
      </article>
    </div>
  );
}
