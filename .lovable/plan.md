Plan to fix `/tools/ai-resume-builder` without changing the UI:

1. **Use the working Cover Letter architecture**
   - The current working cover-letter implementation imports its AI server function from `src/lib/ai-cover-letter.functions.ts`.
   - I will mirror that same safe pattern for Resume Builder with a server function in a client-importable server-function module.
   - Note: this project’s current TanStack Start guard blocks client imports from `src/server/`, so using `@/server/ai-resume.functions` from the route can break builds. I will use the actual working pattern already present in the project: `src/lib/*.functions.ts`.

2. **Create/fix the Resume server function**
   - Add `src/lib/ai-resume.functions.ts` with `createServerFn` from `@tanstack/react-start`.
   - Validate the requested fields with Zod: personal info, skills, experience, customization options, tone, length, and language.
   - Read `process.env.LOVABLE_API_KEY` only inside the server function handler.
   - Call `https://ai.gateway.lovable.dev/v1/chat/completions` server-side only.
   - Use the requested system prompt exactly:
     `You are an expert resume writer. Write ATS-optimized resumes using strong action verbs and quantified achievements. Output clean plain text with === or --- section separators. Never invent credentials.`
   - Return `{ resume: string }`.
   - Preserve error mapping: `429 -> RATE_LIMITED`, `402 -> CREDITS_EXHAUSTED`, all other failures -> `GENERATION_FAILED`.

3. **Update the route only where necessary**
   - Update `src/routes/tools.ai-resume-builder.tsx` to import `generateResume` from the safe server-function path.
   - Remove/avoid any direct browser `fetch` to `ai.gateway.lovable.dev`.
   - Keep all current form fields, UI layout, copy/TXT/PDF actions, SEO content, and related tool sections unchanged.
   - Keep the existing non-async submit wrapper pattern and avoid `useCallback(async () => {})` or component-level async arrow functions.

4. **Clean up the unsafe duplicate**
   - Remove or stop using the existing `src/server/ai-resume.functions.ts` file so the route does not import from the blocked server directory.

5. **Verify**
   - Confirm there is no `ai.gateway.lovable.dev` call in the browser route file.
   - Confirm the route imports only the server function and still calls it through TanStack’s server-function RPC.
   - Run the relevant build/type check signal after implementation to ensure the CORS fix does not introduce the import-protection/Rollup error.