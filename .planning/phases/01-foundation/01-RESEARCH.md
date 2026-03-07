# Phase 1: Foundation - Research

**Researched:** 2026-03-07
**Domain:** React SPA scaffolding, Supabase Auth, GitHub Pages deployment, database schema, CI/CD
**Confidence:** HIGH

## Summary

Phase 1 is a greenfield foundation phase: scaffold a React + Vite + TypeScript SPA, configure Supabase for Google OAuth authentication and database, set up a custom color theme with dark mode, deploy to GitHub Pages, and establish CI with Biome. The database schema should be created for the full application upfront (profiles, wishlists, monitored_cards, price_snapshots, notifications) even though only profiles will be actively used in Phase 1.

The technology choices are all well-established with strong documentation. The main technical nuances are: (1) GitHub Pages SPA routing requires a 404.html redirect workaround for clean URLs, (2) Tailwind CSS v4 uses a CSS-first configuration approach (no tailwind.config.js), and (3) Supabase token encryption with pgcrypto requires careful handling of the encryption key via Supabase Vault or `app.settings`.

**Primary recommendation:** Use the Vite `react-ts` template, Tailwind CSS v4 with `@tailwindcss/vite` plugin, React Router v7 with `BrowserRouter`, and Supabase JS client v2 for auth. Deploy via GitHub Actions to GitHub Pages using the official Vite deployment workflow.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Top navbar with logo + nav links (Dashboard, Settings) + user avatar dropdown on the right
- 3 pages in Phase 1: Login/landing page, Dashboard (empty state placeholder), Settings
- React Router with history-based routing (clean URLs like /dashboard, /settings)
- 404.html workaround for GitHub Pages SPA support (redirect to index.html)
- Avatar dropdown in top-right corner shows user email and logout option
- Follow system preference (OS dark/light mode) as default, using CSS `prefers-color-scheme`
- 5-color palette applied via Tailwind CSS custom theme:
  - Deep Space Blue `#003049` -- Dark mode background, primary color
  - Papaya Whip `#fdf0d5` -- Light mode background
  - Flag Red `#c1121f` -- Primary accent, CTAs, active nav states
  - Steel Blue `#669bbc` -- Secondary buttons, card borders, dividers
  - Molten Lava `#780000` -- Destructive actions, critical alerts

### Claude's Discretion
- Login/landing page layout and design (what unauthenticated users see)
- Settings page UX details (token input show/hide, validation feedback, save confirmation)
- Empty dashboard state appearance (onboarding prompt, illustration, messaging)
- Typography choices and spacing
- Loading states and error handling patterns
- Mobile responsive behavior within the top navbar pattern

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign in with Google OAuth via Supabase | Supabase Auth `signInWithOAuth({ provider: 'google' })` -- well-documented, official quickstart pattern |
| AUTH-02 | User session persists across browser refresh | Supabase client auto-persists session in localStorage, `onAuthStateChange` listener restores state |
| AUTH-03 | User can log out from any page | `supabase.auth.signOut()` from avatar dropdown, React context makes auth state globally accessible |
| SETT-01 | User can add their CardTrader API token (stored encrypted) | `pgcrypto` extension with `pgp_sym_encrypt` using Supabase Vault secret; RLS policy on profiles table |
| SETT-02 | User can update or remove their CardTrader API token | Same Supabase client `update` on profiles table, RLS ensures user can only modify own row |
| QUAL-01 | Project uses Biome for linting and formatting | `@biomejs/biome` -- single dependency replaces ESLint + Prettier, biome.json config |
| QUAL-02 | Biome runs in CI on push/PR via GitHub Actions | GitHub Actions workflow running `npx biome check .` on push and PR events |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19 | UI framework | Current stable, design doc specifies React |
| react-router | ^7.13 | Client-side routing | v7 is current stable; `react-router-dom` is deprecated in v7, import everything from `react-router` |
| @supabase/supabase-js | ^2 | Supabase client (auth + database) | Official JS client, handles OAuth flow, session persistence, RLS-aware queries |
| tailwindcss | ^4 | Utility-first CSS | v4 uses CSS-first config with `@theme` directive, no tailwind.config.js needed |
| @tailwindcss/vite | ^4 | Vite plugin for Tailwind | Replaces PostCSS-based setup, auto-detects content files |
| vite | ^6 | Build tool | Current stable, design doc specifies Vite |
| @vitejs/plugin-react | latest | React support for Vite | JSX/TSX transform, fast refresh |
| typescript | ^5.7 | Type safety | Design doc uses TypeScript throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @biomejs/biome | latest | Linting + formatting | Replace ESLint + Prettier with single tool (QUAL-01) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-router BrowserRouter | HashRouter | Hash routing avoids 404.html workaround but produces ugly URLs; user explicitly chose clean URLs |
| Tailwind CSS v4 | Tailwind CSS v3 | v3 uses tailwind.config.js; v4 is CSS-first, faster, and current |
| Biome | ESLint + Prettier | Two tools vs one; Biome is faster (Rust) and simpler to configure |

**Installation:**
```bash
npm create vite@latest cardtrader-monitor -- --template react-ts
cd cardtrader-monitor
npm install react-router @supabase/supabase-js
npm install -D tailwindcss @tailwindcss/vite @biomejs/biome
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/          # Shared UI components (Navbar, Avatar, ProtectedRoute)
  pages/               # Page components (Login, Dashboard, Settings)
  lib/                 # Utility modules
    supabase.ts        # Supabase client singleton
  contexts/            # React contexts
    AuthContext.tsx     # Auth state provider
  App.tsx              # Router + layout
  main.tsx             # Entry point
  index.css            # Tailwind import + theme variables
public/
  404.html             # GitHub Pages SPA redirect script
supabase/
  migrations/          # SQL migration files
    00001_initial_schema.sql
```

### Pattern 1: Auth Context with Supabase
**What:** Centralized auth state management using React Context + `onAuthStateChange`
**When to use:** Always -- provides auth state to entire app without prop drilling
**Example:**
```typescript
// Source: Supabase Auth docs (https://supabase.com/docs/guides/auth/quickstarts/react)
import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Pattern 2: Protected Route
**What:** Route guard that redirects unauthenticated users to login
**When to use:** For Dashboard and Settings pages
**Example:**
```typescript
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
```

### Pattern 3: GitHub Pages SPA Redirect (404.html)
**What:** Custom 404.html that redirects to index.html preserving the path
**When to use:** Required for history-based routing on GitHub Pages
**Example:**
```html
<!-- public/404.html -->
<!-- Source: https://github.com/rafgraph/spa-github-pages -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <script>
      // Single Page Apps for GitHub Pages
      // MIT License
      // https://github.com/rafgraph/spa-github-pages
      var pathSegmentsToKeep = 1; // 1 for project pages, 0 for user/org pages

      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body>
  </body>
</html>
```

And the corresponding redirect-back script in `index.html` (before app script):
```html
<script>
  // Single Page Apps for GitHub Pages
  (function(l) {
    if (l.search[1] === '/' ) {
      var decoded = l.search.slice(1).split('&').map(function(s) {
        return s.replace(/~and~/g, '&')
      }).join('?');
      window.history.replaceState(null, null,
        l.pathname.slice(0, -1) + decoded + l.hash
      );
    }
  }(window.location))
</script>
```

### Pattern 4: Tailwind v4 Custom Theme with Dark Mode
**What:** CSS-first theme definition using `@theme` directive and CSS variables
**When to use:** For the user's custom 5-color palette with system dark mode
**Example:**
```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --color-deep-space: #003049;
  --color-papaya: #fdf0d5;
  --color-flag-red: #c1121f;
  --color-steel: #669bbc;
  --color-molten: #780000;
}
```

Usage in components: `bg-deep-space`, `text-papaya`, `bg-flag-red`, `border-steel`, `bg-molten`. Dark mode classes use the `dark:` variant which defaults to `prefers-color-scheme: dark` automatically in Tailwind v4.

### Pattern 5: Supabase Client Singleton
**What:** Single Supabase client instance shared across the app
**When to use:** Always -- avoids multiple client instances
**Example:**
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Anti-Patterns to Avoid
- **Creating multiple Supabase client instances:** Causes session sync issues. Use a singleton.
- **Checking `getSession()` for authorization decisions:** Session tokens may be stale. Use `getUser()` for security-critical checks (it validates against the server).
- **Storing user data in localStorage manually:** Supabase handles session persistence. Use the auth context.
- **Using `react-router-dom` package:** Deprecated in v7. Import everything from `react-router`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow | Custom OAuth implementation | `supabase.auth.signInWithOAuth({ provider: 'google' })` | PKCE flow, token refresh, session management all handled |
| Session persistence | localStorage token management | Supabase client `persistSession: true` (default) | Handles refresh tokens, expiry, cross-tab sync |
| Token encryption | Custom encryption functions | `pgcrypto` extension `pgp_sym_encrypt`/`pgp_sym_decrypt` | Battle-tested PostgreSQL extension, handles key management |
| SPA routing on GH Pages | Custom server config | spa-github-pages 404.html pattern | Well-established workaround used by thousands of projects |
| CSS utility framework | Custom CSS design system | Tailwind CSS v4 with `@theme` | Consistent design tokens, responsive utilities, dark mode built-in |
| Linting + formatting | ESLint + Prettier config | Biome single tool | One config file, faster execution, no plugin conflicts |

**Key insight:** Every piece of infrastructure in this phase has a well-established library solution. The main implementation work is wiring them together correctly.

## Common Pitfalls

### Pitfall 1: Supabase OAuth Redirect URL Misconfiguration
**What goes wrong:** After Google sign-in, user gets redirected to wrong URL or gets an error
**Why it happens:** Supabase requires exact redirect URL configuration in both Google Cloud Console and Supabase dashboard
**How to avoid:** Configure `Site URL` in Supabase Auth settings to match your GitHub Pages URL (e.g., `https://username.github.io/cardtrader-monitor/`). Add this same URL to Google OAuth client's authorized redirect URIs. The callback URL format is `https://<project>.supabase.co/auth/v1/callback`.
**Warning signs:** "redirect_uri_mismatch" error after Google sign-in

### Pitfall 2: Vite Base Path for GitHub Pages
**What goes wrong:** All assets return 404 after deploying to GitHub Pages
**Why it happens:** Project pages are served from `/<repo-name>/` not `/`
**How to avoid:** Set `base: '/<repo-name>/'` in `vite.config.ts` AND set `basename` prop on React Router's `BrowserRouter`
**Warning signs:** Blank page in production, working in local dev

### Pitfall 3: 404.html pathSegmentsToKeep Misconfiguration
**What goes wrong:** SPA redirect loses the path or redirects to wrong page
**Why it happens:** `pathSegmentsToKeep` must be `1` for project pages (`username.github.io/repo/`) but `0` for user pages (`username.github.io/`)
**How to avoid:** For this project (project page), set `pathSegmentsToKeep = 1`
**Warning signs:** Routes work on first load but break on refresh

### Pitfall 4: pgcrypto Encryption Key Management
**What goes wrong:** Encryption key is hardcoded or exposed in client code
**Why it happens:** The encryption key used with `pgp_sym_encrypt` must be server-side only
**How to avoid:** Store the encryption key as a Supabase Vault secret or via `ALTER DATABASE ... SET app.settings.encryption_key = '...'`. Access it in SQL via `current_setting('app.settings.encryption_key')`. The frontend never sees the raw key -- encryption/decryption happens server-side via RLS policies or database functions.
**Warning signs:** Encryption key visible in client-side code, API token readable in plaintext from client

### Pitfall 5: Supabase Auth Callback on GitHub Pages
**What goes wrong:** OAuth callback fails because Supabase redirects to `/#access_token=...` and the SPA redirect script interferes
**Why it happens:** Supabase Auth uses URL fragments for token delivery which can conflict with the 404.html redirect
**How to avoid:** Supabase OAuth callback goes to the Supabase project URL first (`<project>.supabase.co/auth/v1/callback`), then redirects to your site URL. Make sure the redirect lands on your root page (`/`) which exists as `index.html`. The token is in the URL fragment (hash), not the path, so the 404.html redirect is not triggered.
**Warning signs:** Infinite redirect loops after OAuth sign-in

### Pitfall 6: Profile Row Not Created on Sign-Up
**What goes wrong:** User signs in successfully but their profile row does not exist in `public.profiles`
**Why it happens:** Supabase Auth creates a user in `auth.users` but not in your custom tables
**How to avoid:** Create a database trigger: `ON INSERT INTO auth.users` execute a function that inserts into `public.profiles`. This is the standard Supabase pattern.
**Warning signs:** "Row not found" errors when accessing settings page after first login

## Code Examples

### Supabase Google OAuth Sign-In
```typescript
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
const handleGoogleSignIn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + import.meta.env.BASE_URL,
    },
  });
  if (error) console.error('Error signing in:', error.message);
};
```

### Database Trigger for Profile Creation
```sql
-- Source: Supabase docs pattern
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Token Encryption via Database Function
```sql
-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to save encrypted token (called via RPC from client)
CREATE OR REPLACE FUNCTION save_api_token(token text)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET
    cardtrader_api_token = pgp_sym_encrypt(token, current_setting('app.settings.encryption_key')),
    updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if token exists (safe for client)
CREATE OR REPLACE FUNCTION has_api_token()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND cardtrader_api_token IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove token
CREATE OR REPLACE FUNCTION remove_api_token()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET cardtrader_api_token = NULL, updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Biome Configuration
```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.x/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  }
}
```

### GitHub Actions CI Workflow (Biome)
```yaml
name: CI

on:
  push:
    branches: ['main']
  pull_request:
    branches: ['main']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: 'npm'
      - run: npm ci
      - run: npx biome check .
```

### GitHub Actions Deploy Workflow
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY }}
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: './dist'
      - uses: actions/deploy-pages@v4
        id: deployment
```

### Vite Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/cardtrader-monitor/',
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `create-react-app` | `npm create vite@latest` | CRA deprecated Feb 2025 | Vite is the standard scaffolding tool |
| `tailwind.config.js` | CSS `@theme` directive | Tailwind v4 (Jan 2025) | No JS config file, faster builds, CSS-first |
| `react-router-dom` package | `react-router` package | React Router v7 (late 2024) | Single package, `react-router-dom` deprecated |
| ESLint + Prettier | Biome | Biome 1.0 (Aug 2023) | Single tool, faster, simpler config |
| PostCSS for Tailwind | `@tailwindcss/vite` plugin | Tailwind v4 (Jan 2025) | Direct Vite integration, no PostCSS config |
| Supabase `getSession()` for auth checks | `getUser()` for server validation | Supabase JS v2 | `getSession()` reads local storage only; `getUser()` validates with server |

**Deprecated/outdated:**
- `create-react-app`: Officially deprecated, do not use
- `react-router-dom`: Deprecated in v7, import from `react-router` directly
- `tailwind.config.js`: Still works in v4 but CSS-first `@theme` is the new standard
- Supabase `auth-helpers-react`: Legacy package, use `@supabase/supabase-js` directly with `onAuthStateChange`

## Open Questions

1. **Exact repo name for base path**
   - What we know: The vite `base` config and BrowserRouter `basename` must match the GitHub Pages repo name
   - What's unclear: Confirm the repo is `cardtrader-monitor` on GitHub
   - Recommendation: Use `'/cardtrader-monitor/'` and adjust if different

2. **Supabase Vault vs app.settings for encryption key**
   - What we know: Both approaches work. Vault is newer and more secure. `app.settings` is simpler.
   - What's unclear: Whether Supabase free tier includes Vault
   - Recommendation: Use `app.settings.encryption_key` approach (works on all tiers, well-documented). Can migrate to Vault later.

3. **Supabase project setup**
   - What we know: Need a Supabase project with Google OAuth provider configured
   - What's unclear: Whether the user has already created the Supabase project
   - Recommendation: Include project creation and Google OAuth setup instructions in Phase 1 tasks, as prerequisite manual steps

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | none -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Google OAuth sign-in triggers Supabase OAuth | unit | `npx vitest run src/__tests__/auth.test.tsx -t "sign in"` | No -- Wave 0 |
| AUTH-02 | Session restored from storage on mount | unit | `npx vitest run src/__tests__/auth.test.tsx -t "session persist"` | No -- Wave 0 |
| AUTH-03 | Sign-out clears session | unit | `npx vitest run src/__tests__/auth.test.tsx -t "sign out"` | No -- Wave 0 |
| SETT-01 | Save token calls RPC function | unit | `npx vitest run src/__tests__/settings.test.tsx -t "save token"` | No -- Wave 0 |
| SETT-02 | Remove token calls RPC function | unit | `npx vitest run src/__tests__/settings.test.tsx -t "remove token"` | No -- Wave 0 |
| QUAL-01 | Biome check passes on codebase | smoke | `npx biome check .` | No -- Wave 0 |
| QUAL-02 | CI workflow file exists and is valid | manual-only | Verify `.github/workflows/ci.yml` exists | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npx biome check .`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` -- install as dev dependencies
- [ ] `vitest.config.ts` or test config in `vite.config.ts` -- environment: jsdom, globals: true
- [ ] `src/__tests__/auth.test.tsx` -- covers AUTH-01, AUTH-02, AUTH-03
- [ ] `src/__tests__/settings.test.tsx` -- covers SETT-01, SETT-02

## Sources

### Primary (HIGH confidence)
- [Supabase Auth React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react) -- Auth setup, onAuthStateChange pattern
- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google) -- Google provider configuration
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS policy patterns
- [Supabase Session Docs](https://supabase.com/docs/guides/auth/sessions) -- Session management, auto-refresh
- [Vite Static Deploy Guide](https://vite.dev/guide/static-deploy) -- GitHub Pages workflow YAML
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs) -- v4 setup with Vite, @theme directive
- [Tailwind Dark Mode Docs](https://tailwindcss.com/docs/dark-mode) -- prefers-color-scheme default behavior
- [React Router v7 Installation](https://reactrouter.com/start/declarative/installation) -- v7 setup, BrowserRouter
- [Biome Configuration Reference](https://biomejs.dev/reference/configuration/) -- biome.json structure
- [spa-github-pages](https://github.com/rafgraph/spa-github-pages) -- 404.html redirect pattern

### Secondary (MEDIUM confidence)
- [Supabase Database Migrations Docs](https://supabase.com/docs/guides/deployment/database-migrations) -- Migration file structure
- Design document at `docs/plans/2026-02-01-cardtrader-monitor-design.md` -- Full DB schema, RLS policies, pgcrypto approach

### Tertiary (LOW confidence)
- pgcrypto `app.settings` approach -- verified in Supabase community discussions but not prominently in official docs; well-established PostgreSQL pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are well-documented, current, and widely used
- Architecture: HIGH -- patterns come from official Supabase and React docs
- Pitfalls: HIGH -- based on official docs and well-known GitHub Pages limitations
- Token encryption: MEDIUM -- pgcrypto approach is from design doc, confirmed in community, but key management details vary

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable stack, 30-day window)
