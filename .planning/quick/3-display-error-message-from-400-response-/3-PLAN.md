---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ImportWishlistForm.tsx
autonomous: true
requirements: [QUICK-3]

must_haves:
  truths:
    - "When import-wishlist Edge Function returns 400 with JSON body { error: '...' }, the user sees that exact error message"
    - "Non-400 errors still display a generic fallback message"
  artifacts:
    - path: "src/components/ImportWishlistForm.tsx"
      provides: "Error extraction from FunctionsHttpError response body"
  key_links:
    - from: "src/components/ImportWishlistForm.tsx"
      to: "supabase/functions/import-wishlist/index.ts"
      via: "supabase.functions.invoke error handling"
      pattern: "fnError\\.context.*json.*error"
---

<objective>
Display the server-provided error message from 400 responses during wishlist import.

Purpose: When the Edge Function returns a 400 (e.g., "Maximum 2 wishlists allowed..."), the user currently sees a generic "Edge Function returned a non-2xx status code" message because the Supabase functions client stores the raw Response object in `fnError.context` without consuming the body. We need to parse the response body to extract the actual error message.

Output: Updated ImportWishlistForm.tsx with proper error extraction from FunctionsHttpError responses.
</objective>

<execution_context>
@/Users/mspigolon/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mspigolon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/ImportWishlistForm.tsx

<interfaces>
<!-- Supabase functions-js error handling -->
<!-- From node_modules/@supabase/functions-js/src/types.ts -->

When `functions.invoke` gets a non-2xx response:
- `fnError` is a `FunctionsHttpError` instance
- `fnError.message` = "Edge Function returned a non-2xx status code" (generic, useless)
- `fnError.context` = the raw `Response` object (body NOT consumed)
- Must call `fnError.context.json()` to get the actual `{ error: "..." }` payload

From node_modules/@supabase/functions-js/src/FunctionsClient.ts (line 169-171, 192-199):
```typescript
if (!response.ok) {
  throw new FunctionsHttpError(response)  // context = Response object
}
// ...
return {
  data: null,
  error,  // the FunctionsHttpError
  response: error instanceof FunctionsHttpError ? error.context : undefined,
}
```

The Edge Function (supabase/functions/import-wishlist/index.ts) returns 400 errors as:
```typescript
return new Response(JSON.stringify({ error: 'Maximum 2 wishlists allowed...' }), {
  status: 400,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract error message from Edge Function HTTP error responses</name>
  <files>src/components/ImportWishlistForm.tsx</files>
  <action>
In the `handleImport` function, update the `if (fnError)` block (lines 38-41) to extract the actual error message from the response body when the Edge Function returns a non-2xx status.

Replace the current error handling:
```typescript
if (fnError) {
  setError(fnError.message || 'Import failed. Please try again.');
  return;
}
```

With logic that:
1. Checks if `fnError.context` is a Response object (it is for FunctionsHttpError)
2. Attempts to parse the response body as JSON via `fnError.context.json()`
3. If the parsed body has an `error` string property, use that as the error message
4. Falls back to `fnError.message` then to generic 'Import failed. Please try again.' if parsing fails

Implementation pattern:
```typescript
if (fnError) {
  let message = 'Import failed. Please try again.';
  try {
    if (fnError.context && typeof fnError.context.json === 'function') {
      const body = await fnError.context.json();
      if (body?.error && typeof body.error === 'string') {
        message = body.error;
      }
    } else if (fnError.message) {
      message = fnError.message;
    }
  } catch {
    // JSON parsing failed, use default message
  }
  setError(message);
  return;
}
```

Do NOT import FunctionsHttpError or add any new dependencies. The duck-typing check on `fnError.context.json` is sufficient and avoids coupling to the Supabase internal class hierarchy.
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>When the import-wishlist Edge Function returns a 400 with `{ "error": "Maximum 2 wishlists allowed..." }`, that exact message is displayed to the user. Non-JSON or missing error responses fall back to a generic message.</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors: `npx tsc --noEmit`
- Biome lint passes: `npx biome check src/components/ImportWishlistForm.tsx`
</verification>

<success_criteria>
- 400 response error messages from the Edge Function are displayed verbatim to the user
- Non-JSON error responses or network errors fall back gracefully to generic messages
- No TypeScript or lint errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/3-display-error-message-from-400-response-/3-SUMMARY.md`
</output>
