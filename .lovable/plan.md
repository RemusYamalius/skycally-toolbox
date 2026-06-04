## IP Address Lookup Tool

### New Route
- File: `src/routes/tools.ip-address-lookup.tsx`
- URL: `/tools/ip-address-lookup`
- Route registration with `buildToolMeta(toolBySlug("ip-address-lookup", tools))`

### Tool Registration
- Add entry to `src/lib/tools.ts` with slug `ip-address-lookup`, category `utility`, name "IP Address Lookup", description "Look up any IP address to see its location, ISP, timezone and more."
- Add `Globe` icon import from lucide-react (new import to add).

### Related Tools
- Add entry to `src/lib/related-tools.ts` mapping `ip-address-lookup` to 3 related utility tool slugs (e.g. `network-speed-test`, `qr-generator`, `url-encoder`).

### Page Behavior
1. **Auto-detect on load**: Fetch `https://api.ipify.org?format=json` via `useEffect` to get the user's public IP. Show a skeleton/loading state while detecting.
2. **Manual lookup**: Input field to type any IP address, with a "Lookup" button. On submit (or Enter), fetch details for the entered IP.
3. **IP details API**: Fetch `https://ipapi.co/{ip}/json/` for any IP (auto-detected or manual).
4. **Display cards** (after data loads):
   - IP Address (with "Copy IP" button using navigator.clipboard + sonner toast)
   - Country + flag emoji
   - Region / State
   - City
   - ISP / Organization
   - Timezone
   - Latitude & Longitude
5. **Loading & error states**: Skeleton shimmer while fetching, error message if API fails or IP is invalid.
6. **Styling**: Uses existing dark theme semantic tokens (`bg-card`, `border-border`, `text-muted-foreground`, etc.). Cards use the same rounded-2xl border pattern as existing tool metric cards. No custom colors.
7. **Standard page shell**: Wraps in `ToolPageShell` (which already includes the "No files are stored on our servers" badge), `HowToUse`, `ToolSeoContent`, and `RelatedTools`.

### No Backend
Everything runs in the browser. No server functions, no database, no Supabase needed.