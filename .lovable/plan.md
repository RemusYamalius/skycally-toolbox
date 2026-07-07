## Goal

Fix the failing "Google Search Console isn't fully set up" finding by connecting GSC to the project, verifying ownership of `https://skycally.com/`, and submitting the sitemap.

## Steps

1. **Trigger the GSC connector**
   - Call `standard_connectors--connect` with `connector_id: "google_search_console"`.
   - This opens the OAuth authorization card in chat. You sign in with the Google account that will own the Search Console property.
   - Wait for the connection to land before continuing.

2. **Request a META verification token**
   - Call the Site Verification API through the connector gateway to request a `META` token for `https://skycally.com/`.
   - The response is a full `google-site-verification` content string.

3. **Add the verification meta tag to the site**
   - Insert `<meta name="google-site-verification" content="…" />` into the `head()` of `src/routes/__root.tsx` so it renders on every page (including the homepage that Google will fetch).
   - This requires a build-mode edit and a publish so the tag is live on `https://skycally.com/`.

4. **Ask Google to verify**
   - Once the site is republished, call the Site Verification `webResource?verificationMethod=META` endpoint.
   - A 200 means verified. A 400 `failedToFindMetaTag` means the deploy hasn't propagated yet — retry after a moment.

5. **Add the site to Search Console**
   - Call `PUT /webmasters/v3/sites/https%3A%2F%2Fskycally.com%2F` so the property appears in the user's Search Console list.

6. **Submit the sitemap**
   - Call `PUT /webmasters/v3/sites/https%3A%2F%2Fskycally.com%2F/sitemaps/https%3A%2F%2Fskycally.com%2Fsitemap.xml` to register the existing sitemap.

7. **Mark the SEO finding fixed**
   - After verification and sitemap submission succeed, call `seo_chat--update_findings` on `gsc:gsc` with `state: "fixed"`.

## What you need to do

- Approve the connector card when it appears and sign in to Google with the account that should own the Search Console property for skycally.com.
- **Publish** the project after I add the verification meta tag, so Google can fetch it from the live domain. Verification will not succeed against the preview URL.

## Notes

- Only the META verification method is used — DNS, file-upload, and Analytics methods aren't available in this workflow.
- The meta tag is harmless to keep in place after verification; it stays as proof of ownership.
- No existing head metadata is removed; the verification tag is added alongside current tags in `__root.tsx`.
