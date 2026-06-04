## SSH Key Generator — /tools/ssh-key-generator

A new utility tool that generates SSH key pairs entirely in the browser. No backend, no uploads.

### Files

1. **`src/routes/tools.ssh-key-generator.tsx`** (new) — full page
2. **`src/lib/tools.ts`** — register tool (KeyRound icon, `utility` category)
3. **`src/lib/related-tools.ts`** — link to `password-generator`, `hash-generator`, `uuid-generator`

### UI (matches Skycally dark theme via existing tokens + ToolPageShell)

- **Options card**
  - Key type select: `Ed25519 (recommended)`, `RSA 2048`, `RSA 3072`, `RSA 4096`
  - Comment input (default `user@hostname`)
  - "Generate Key Pair" button (shows spinner while working)
- **Warning banner** (orange tone): "⚠ Never share your private key. Save it securely immediately."
- **Result panels** (shown after generation)
  - Public Key box — monospace, Copy button, "ssh-…" one-line OpenSSH format
  - Private Key box — monospace, Copy button, red border + "PRIVATE — keep secret" label, OpenSSH PEM format
  - "Download Keys" button → saves `id_<type>.pub` and `id_<type>` as `.txt` via Blob download
- **Explanation section** (after results / inside ToolPageShell)
  - What is SSH? / Public vs Private key / How to add to GitHub & servers (short paragraphs)
- Standard `HowToUse`, `ToolSeoContent`, `RelatedTools` blocks
- "No data is stored on our servers — keys are generated locally in your browser" badge (extends the shell's existing badge with a short note shown above results)

### Crypto approach (all client-side)

- **Ed25519**: `window.crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign","verify"])`, then export raw public key + PKCS8 private key. Encode to OpenSSH wire format manually (small helper: length-prefixed `ssh-ed25519` string + 32-byte pubkey, base64; private key in OpenSSH `-----BEGIN OPENSSH PRIVATE KEY-----` block).
- **RSA**: load `node-forge` from CDN via existing `src/lib/cdnScript.ts` `loadScript` helper (`https://cdn.jsdelivr.net/npm/node-forge@1.3.1/dist/forge.min.js`). Use `forge.pki.rsa.generateKeyPair({ bits, workers: -1 })` then `forge.ssh.publicKeyToOpenSSH(pub, comment)` and `forge.ssh.privateKeyToOpenSSH(priv)`.
- Ed25519 browser support fallback: if `crypto.subtle.generateKey` throws on Ed25519 (older browsers), fall back to forge's ed25519 module from the same CDN bundle.

### Notes

- Pure frontend work — no server function, no env vars, no DB.
- Follows existing tool-page conventions (ToolPageShell + HowToUse + ToolSeoContent + RelatedTools).
- English-only copy throughout.
