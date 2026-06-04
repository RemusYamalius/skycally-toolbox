# Port Checker Tool

## New route
- `src/routes/tools.port-checker.tsx` at `/tools/port-checker`
- Standard shell: `ToolPageShell` → form → result → `HowToUse` → `ToolSeoContent` → `RelatedTools`

## Registration
- Add `{ slug: "port-checker", name: "Port Checker", description: "Check whether a port is open on any host. Quick test for common ports right in your browser.", category: "utility", icon: Network (lucide-react), path: "/tools/port-checker" }` to `src/lib/tools.ts`.
- Add `"port-checker": ["ip-address-lookup", "network-speed-test", "qr-generator"]` to `src/lib/related-tools.ts`.

## UI
1. **Inputs row**: Host (text) + Port (number 1–65535) + Check button.
2. **Common port quick-select** — 7 chips:
   - 80 HTTP, 443 HTTPS, 8080 HTTP-Alt → testable (no warning)
   - 22 SSH, 21 FTP, 3306 MySQL, 3389 RDP → marked with ⚠ icon + tooltip "Cannot be tested from the browser"
   - Clicking any chip fills the port field.
3. **Description strip** below chips: small line explaining the selected port's purpose (lookup from a `PORT_INFO` map: 21 FTP file transfer, 22 SSH remote shell, 80 HTTP web, 443 HTTPS secure web, 3306 MySQL DB, 3389 Remote Desktop, 8080 HTTP-alt/proxy).
4. **Result card**:
   - Green badge **OPEN** (var(--green-brand)), red badge **CLOSED** (var(--destructive)), or amber **UNKNOWN**.
   - Response time in ms (tabular-nums).
   - Tested host:port echo.
5. **Non-testable port notice**: When port ∈ {22,21,3306,3389} or any non-HTTP-class port, the Check button is disabled and a card shows: "This port cannot be tested directly from the browser due to security restrictions. Use a desktop tool like Nmap or an online service like portchecker.co."

## Detection logic (browser-only)
- Testable ports: 80, 443, 8080 (and other typical HTTP-class ports the user types, treated heuristically — but to keep things honest we restrict the actual fetch test to 80/443/8080; any other port shows the notice).
- For testable ports:
  ```
  scheme = port === 443 ? "https" : "http"
  url = `${scheme}://${host}:${port}/`
  controller = AbortController; timeout 4000ms
  t0 = performance.now()
  try {
    await fetch(url, { mode: "no-cors", signal: controller.signal, cache: "no-store" })
    → OPEN, ms = now - t0
  } catch (err) {
    if (err.name === "AbortError") → CLOSED (timeout), ms = 4000
    else → CLOSED, ms = now - t0
  }
  ```
  `no-cors` always resolves opaque on a successful TCP+HTTP handshake, so distinguishing OPEN vs CLOSED reduces to "did we get a TypeError before the timeout".
- Host validation: non-empty string matching a simple hostname/IPv4 regex; trim and strip any leading `http(s)://`.

## Styling
- Pure semantic tokens (`bg-card`, `border-border`, `text-muted-foreground`, brand vars for accents) — same `rounded-2xl border border-border bg-card/60 p-5` card pattern as `ip-address-lookup`.
- Dark theme matches automatically.
- "No data is stored on our servers" badge: already provided by `ToolPageShell`.

## SEO content
- `ToolSeoContent`:
  - title: "Free Online Port Checker — Test if a TCP Port Is Open"
  - description: 1–2 sentence summary.
  - body: 3 paragraphs (~170 words) on what port checking is, browser limitations, when to use a real scanner.
  - 4 FAQs: What is a port? Why can't I test SSH/FTP from the browser? Is this private? What does a closed result mean?

## No backend
All logic runs in the browser. No server functions, no Cloudflare worker, no external paid API. Public free APIs are not used.
