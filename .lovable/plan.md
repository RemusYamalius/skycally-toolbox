### New Tool: WebRTC Leak Test at `/tools/webrtc-leak-test`

Create a browser-based WebRTC leak detection tool that runs entirely client-side, following the existing Skycally tool-page patterns.

#### Route file
Create `src/routes/tools.webrtc-leak-test.tsx` with:
- `createFileRoute('/tools/webrtc-leak-test')` with `buildToolMeta`
- `ToolPageShell` wrapping the page
- **On mount**: two parallel fetches
  1. `fetch('https://api.ipify.org?format=json')` → public IP
  2. `RTCPeerConnection` + `createDataChannel('')` + `createOffer` + `setLocalDescription`, then listen to `icecandidate` events on a STUN server (`stun:stun.l.google.com:19302`) to collect `srflx` and `host` candidates
- Parse candidate strings with a regex to extract IP addresses; collect unique IPs from `srflx` candidates as the "WebRTC Detected IP(s)"
- **Comparison logic**: if any WebRTC IP differs from the ipify public IP → red leak alert; if they match (or no WebRTC IPs found) → green safe badge
- Display three info cards:
  - Public IP (from ipify)
  - WebRTC Detected IP(s) — list, or "None detected"
  - Leak Status — large colored badge (green/red) with check/x icon
- Show a brief explanation paragraph under the status: "WebRTC can reveal your real IP address even when using a VPN"
- Add a "Run Test Again" button to re-trigger the detection
- Include `HowToUse`, `ToolSeoContent` (title, description, 3 paragraphs, 4 FAQs), and `RelatedTools` as required by project conventions
- All styling via semantic tokens (`bg-card`, `border-border`, `text-foreground`, etc.) to match the dark theme automatically

#### Tool registry
- Add `{ slug: "webrtc-leak-test", name: "WebRTC Leak Test", description: "Check if WebRTC is leaking your real IP address behind a VPN.", category: "utility", icon: Shield, path: "/tools/webrtc-leak-test" }` to `src/lib/tools.ts`
- Import `Shield` from `lucide-react` in the same import block

#### Related tools
- Add `"webrtc-leak-test"` entry in `src/lib/related-tools.ts` mapping to `["ip-address-lookup", "network-speed-test", "port-checker"]`

#### No backend
Everything runs in the browser using public STUN and ipify APIs. No server functions, no database, no external proxies.

#### SEO
Use `buildToolMeta` for route `head()`. `ToolSeoContent` covers on-page SEO with keywords like "WebRTC leak test", "VPN leak detection", and "IP privacy".
