## DNS & IP Leak Check Tool

### Overview
Build a new tool page at `/tools/dns-leak-test` titled **"DNS & IP Leak Check"** that honestly shows the user's public IP geolocation and lets them self-assess whether their connection matches their expected VPN location.

### Page Structure
- **ToolPageShell** with title "DNS & IP Leak Check" and standard description
- **Status hero section**: green badge "Your connection appears secure ✓" or yellow badge "Your DNS may be leaking ⚠"
- **Info cards** (3-column grid): Public IP, Detected Location (country + ISP + timezone), Leak Status
- **VPN toggle section**: "Are you using a VPN?" checkbox + country `<select>` that appears when checked. Detected country compared against selected expected country.
- **Honest disclaimer**: "For a complete DNS leak test, visit dnsleaktest.com" with link
- **"Test Again" button** to re-fetch IP and geo data
- **Standard components**: `HowToUse`, `ToolSeoContent` (with SEO title, description, 2-3 paragraph body, 4 FAQs), `RelatedTools`
- **"No data is stored on our servers"** badge

### Data Flow
1. On mount: `fetch('https://api.ipify.org?format=json')` → public IP
2. Then: `fetch('https://ipapi.co/{IP}/json/')` → country, ISP, region, city, timezone
3. User toggles VPN checkbox → selects expected country from dropdown
4. Compare: detected country === expected country → green secure; mismatch → yellow warning

### Design
- Matches existing Skycally dark theme using semantic CSS tokens (`--green-brand`, `--orange-brand`, `--cyan-brand`, `--violet-brand`, `--card`, `--border`, etc.)
- Uses same card styling, motion animations (`framer-motion`), and layout patterns as the WebRTC Leak Test page

### Tool Registry
- Add tool entry to `src/lib/tools.ts`: slug `dns-leak-test`, name `DNS & IP Leak Check`, category `utility`, Shield icon
- Add `dns-leak-test` mapping to `related-tools.ts` pointing to `ip-address-lookup`, `network-speed-test`, `webrtc-leak-test`

### No Backend
Everything runs in the browser using public APIs. No server functions, no database.