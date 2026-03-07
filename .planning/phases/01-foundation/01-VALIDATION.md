---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && npx biome check .` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && npx biome check .`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | QUAL-01 | smoke | `npx biome check .` | No — W0 | pending |
| 01-02-01 | 02 | 1 | AUTH-01 | unit | `npx vitest run src/__tests__/auth.test.tsx -t "sign in"` | No — W0 | pending |
| 01-02-02 | 02 | 1 | AUTH-02 | unit | `npx vitest run src/__tests__/auth.test.tsx -t "session persist"` | No — W0 | pending |
| 01-02-03 | 02 | 1 | AUTH-03 | unit | `npx vitest run src/__tests__/auth.test.tsx -t "sign out"` | No — W0 | pending |
| 01-03-01 | 03 | 1 | SETT-01 | unit | `npx vitest run src/__tests__/settings.test.tsx -t "save token"` | No — W0 | pending |
| 01-03-02 | 03 | 1 | SETT-02 | unit | `npx vitest run src/__tests__/settings.test.tsx -t "remove token"` | No — W0 | pending |
| 01-04-01 | 04 | 2 | QUAL-02 | manual-only | Verify `.github/workflows/ci.yml` exists | No — W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` — install as dev dependencies
- [ ] `vitest.config.ts` or test config in `vite.config.ts` — environment: jsdom, globals: true
- [ ] `src/__tests__/auth.test.tsx` — stubs for AUTH-01, AUTH-02, AUTH-03
- [ ] `src/__tests__/settings.test.tsx` — stubs for SETT-01, SETT-02

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI workflow runs on push/PR | QUAL-02 | Requires GitHub Actions execution | 1. Push to branch 2. Verify CI job runs 3. Check Biome step passes |
| Google OAuth sign-in flow | AUTH-01 | Requires real Google OAuth redirect | 1. Click "Sign in with Google" 2. Complete OAuth flow 3. Verify redirect back to app |
| Session persists across refresh | AUTH-02 | Requires real Supabase session | 1. Sign in 2. Refresh browser 3. Verify still signed in |
| GitHub Pages deployment | N/A | Requires GitHub Pages infrastructure | 1. Push to main 2. Verify deploy workflow completes 3. Access deployed URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
