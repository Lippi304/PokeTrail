<!-- GSD:project-start source:PROJECT.md -->
## Project

**PokeTrail**

PokeTrail ist ein browserbasiertes Pokémon-Roguelike: Spieler wählen einen Gen-1-Starter, kämpfen sich durch zufällig generierte Routen, sammeln Team-Mitglieder und Items, gewinnen Orden in 8 Arenen und müssen am Ende Top 4 + Champion besiegen. Inspiriert von [pokelike.xyz](https://pokelike.xyz/), aber mit cleanerem Dark-UI, modularer Architektur und englischen Pokémon-Namen. Zielgruppe: Pokémon-Fans, die einen schnellen 30–45 min Run im Browser spielen wollen.

**Core Value:** Ein vollständiger Run von Starter-Auswahl bis Champion muss sich in unter 45 Minuten flüssig spielen lassen — Kämpfe fühlen sich richtig an (Schadensformel, Typ-Effektivität, STAB), und der Run-Loop (Route → Encounter → Reward → Arena) zieht in die nächste Runde.

### Constraints

- **Tech stack**: React 18+ mit Vite + TypeScript + Tailwind CSS — moderne, schnelle Toolchain ohne SSR-Overhead
- **Tech stack**: State via React Context + useReducer — kein Redux/Zustand in v1, Spec-Vorgabe
- **Tech stack**: Persistenz nur localStorage — kein Backend, kein Auth, alles client-side
- **Tech stack**: Vitest für Engine-Tests — Pflicht für Schadensformel, Typ-Tabelle, Level-Up, Item-Effekte. UI manuell getestet
- **Tech stack**: Keine `any`-Types, alles sauber typisiert (`strict: true` in tsconfig)
- **Tech stack**: Kein inline CSS, keine separaten CSS-Dateien — Tailwind only, `bg-[#0a0a0a]` als Base
- **Performance**: Keine Runtime-PokéAPI-Calls für Gameplay — statisches JSON im Bundle, Sprites lazy
- **Compatibility**: Desktop-first, aber Mobile responsive funktional
- **Hosting**: Vercel ab Tag 1 mit Git-basiertem Auto-Deploy
- **Code quality**: Komponenten max ~150 Zeilen pro Datei, Game-Logik strikt getrennt von UI
- **Scope**: v1 = Phase 1-4 (Foundation → Core Loop → Full Game → Polish), Nuzlocke und Gen 2+ explizit später
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## TL;DR — Recommended Stack
| Layer | Choice | Confidence |
|---|---|---|
| Bundler | **Vite 6.x** (Rolldown-Vite optional) | HIGH |
| UI framework | **React 19.2** (push back on user's "React 18+") | HIGH |
| Language | **TypeScript 5.7+** with `strict: true` | HIGH |
| Styling | **Tailwind CSS v4.2** via `@tailwindcss/vite` plugin | HIGH |
| State | **React Context + useReducer + Immer** (per spec) | HIGH |
| Persistence | **localStorage** + **Zod 3.x** schema validation | HIGH |
| Animations | **Motion** (`motion` package, successor to `framer-motion`) | MEDIUM |
| Sprite handling | Native `<img loading="lazy">` + custom hook for preload | HIGH |
| Build-time data | Pre-build Node script → `src/data/*.json` (committed) | HIGH |
| PWA | **vite-plugin-pwa** (Workbox under the hood) | HIGH |
| Tests | **Vitest 2.x** + `@testing-library/react` + `jsdom` | HIGH |
| Routing | **None** — discriminated-union state machine (`screen` field) | HIGH |
| Hosting | **Vercel** (static SPA, no server runtime) | HIGH |
## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|---|---|---|---|
| Vite | 6.x (latest 6.0+) | Dev server + bundler | Zero-config for React+TS, instant HMR, native ESM in dev, Rollup-based prod build. Vite 6 is current stable line; Vite 7 may exist but 6.x is broadly supported by ecosystem plugins (Tailwind v4, vite-plugin-pwa, vitest). Lock to whatever `npm create vite@latest` scaffolds. **CONFIRMED user choice.** |
| React | **19.2** (NOT 18) | UI runtime | React 19 became stable 2024-12-05; React 19.2 (2025-10-01) added Activity, useEffectEvent, performance tracks. React 18 is now maintenance-only. For a greenfield 2026 project, choosing 18 means inheriting an LTS-style branch instead of the current line. **PUSH BACK on user's "React 18+" — start on 19.2.** Migration cost from 18→19 later is non-trivial (StrictMode behavior, ref-as-prop, removed `forwardRef` in 19, new compiler). The constraint says "React 18+" so 19 satisfies it literally; the spirit of "modern, fast toolchain" demands 19. |
| TypeScript | 5.7+ (or 5.8 if released) | Language | Required by the no-`any`, `strict: true` constraint. TS 5.x is stable; pick the latest minor that the React 19 type defs support (`@types/react@^19`). Use `tsconfig.json` with `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true` for game-engine safety (off-by-one party-slot bugs, missing held-item fields). |
| Tailwind CSS | **v4.2** | Styling | v4 is a complete rewrite: Oxide engine (5–10× faster builds), zero-config by default, CSS-first `@theme` directive, no more `tailwind.config.js` required (you can still have one). Critically, **v4 ships a first-party Vite plugin (`@tailwindcss/vite`)** which is the supported install path — no more PostCSS pipeline. **CONFIRMED but with version push: use v4, not v3.** v3 is now legacy. |
| @tailwindcss/vite | 4.2 (matches tailwindcss) | Tailwind integration | Replaces `postcss` + `autoprefixer` for Tailwind v4 in Vite projects. Add to `vite.config.ts` plugins array. |
| @vitejs/plugin-react | 4.x | React Fast Refresh + JSX | Standard React plugin for Vite. Use `@vitejs/plugin-react` (Babel-based, mature) over `@vitejs/plugin-react-swc` unless build speed becomes a bottleneck. SWC variant is faster but has occasional plugin-compat gaps. |
| Vitest | 2.x | Test runner | Vite-native test runner — shares Vite's transform pipeline, so `vite.config.ts` aliases/plugins "just work" in tests. Required for the engine-test mandate (damage formula, type chart, level-up, item effects). **CONFIRMED user choice.** |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---|---|---|---|
| **immer** | 10.x | Immutable updates inside `useReducer` | Phase 1 onward. Without Immer, deeply nested updates (`state.run.team[2].moves[0].pp -= 1`) become 4-line spread chains. With Immer's `produce`, write mutating-style code that produces immutable next state. Pairs natively with `useReducer` via `useImmerReducer` from `use-immer`. Pulls in ~3 KB gzipped. **Strongly recommended** given the deeply-nested `GameState` shape in the spec. |
| **use-immer** | 0.10+ | `useImmerReducer` hook | Drop-in replacement for `useReducer` that auto-wraps the reducer in Immer's `produce`. Two-line change, massive ergonomic win for the run-state reducer. |
| **zod** | 3.23+ (3.x line; v4 not yet stable as of writing — pin to 3.x) | Runtime schema validation | Validate **everything** crossing the localStorage boundary. The save format will change between dev iterations; without Zod, a stale save crashes the app on load with cryptic "cannot read property X of undefined" errors. Use `safeParse` on load, fall back to "new run" on schema mismatch, optionally migrate. Also use Zod schemas as the source of truth for the build-time PokéAPI fetch script — validate the API response before writing JSON. **Critical infrastructure, not optional.** |
| **motion** | 11.x (successor to `framer-motion`) | Animations (Phase 4) | Framer reorganized — the React animation library was renamed and now lives at the npm package `motion`. Same API as `framer-motion@11+`. Use for screen transitions (`<AnimatePresence>` + slide/fade), HP-bar tweens, KO fade, sprite shake on hit. Alternative: pure Tailwind transitions for simple stuff, Motion for orchestrated sequences. Don't pull in Motion for a one-line opacity transition — Tailwind's `transition-opacity duration-300` is enough. Defer install to Phase 4 to keep Phase 1–3 bundle small. |
| **vite-plugin-pwa** | 0.21+ | Service worker + manifest (Phase 4) | Generates `manifest.webmanifest` and a Workbox-based service worker. Configure `registerType: 'autoUpdate'`, precache the JSON data files and core JS chunks, runtime-cache PokéAPI sprite URLs with a `CacheFirst` strategy + 30-day expiration. This is the right call for "installable" + "works offline once loaded." Defer install to Phase 4. |
| **clsx** OR **tailwind-merge** | clsx 2.x / tailwind-merge 2.x | Conditional class names | `clsx` for joining; `tailwind-merge` for resolving conflicts (`bg-red-500 bg-blue-500` → `bg-blue-500`). Combine via `tailwind-variants` or a tiny `cn()` helper. Phase 1 nice-to-have, mandatory by Phase 2 once `<TypeBadge>` and `<MoveButton>` start needing dynamic Tailwind classes. |
| **@testing-library/react** | 16.x (React 19-compatible) | Component test queries | For the rare UI test (e.g. "starter selection renders 3 cards"). Per the spec, UI is manually tested, so this stays minimal. |
| **jsdom** | 25.x | DOM in Vitest | Required `environment: 'jsdom'` in `vitest.config.ts` for any test that touches React or `localStorage`. Engine tests can stay in `environment: 'node'` for speed. |
| **happy-dom** | 15.x | Faster jsdom alternative | Optional swap for `jsdom`. ~2× faster on cold start, occasional API gaps. Stick with jsdom unless test suite grows large. |
### What I deliberately did NOT recommend
| Library | Why excluded |
|---|---|
| `react-router` / `react-router-dom` | Spec uses a `screen` enum in `GameState`. A discriminated union driven by reducer is simpler, more testable, and avoids URL state for an app where deep-linking into a battle makes no sense (Pokémon battle state is non-shareable). Adds 15+ KB for no benefit. |
| Redux Toolkit / Zustand / Jotai | Hard constraint: "kein Redux/Zustand in v1, Spec-Vorgabe." Context + useReducer + Immer covers everything. |
| Howler.js / Tone.js | Sound is explicitly out of scope for v1. Add in post-v1 if needed. |
| react-query / SWR | No runtime data fetching for gameplay (data is bundled). Sprites are loaded via plain `<img>` — no need for a query client. |
| GSAP | Heavier than Motion, weaker React integration, commercial license caveats for some plugins. Motion's React-first API is a better fit. |
| storybook | Overkill for this scope. The 4-phase plan ships in weeks, not months — skip. |
| eslint-plugin-react-hooks-refresh / various lint stacks | Use `eslint-plugin-react-hooks` + `@typescript-eslint` only. Keep lint config minimal — game-engine bugs are not the kind ESLint catches. |
| `dexie` / IndexedDB wrapper | Save data is < 50 KB. localStorage is sufficient and simpler. Reach for IndexedDB only if you start storing replays. |
### Development Tools
| Tool | Purpose | Notes |
|---|---|---|
| `npm` | Package manager | Spec-mandated. Pin Node to 20.x LTS or 22.x LTS via `.nvmrc` and `engines` in `package.json`. |
| ESLint 9 (flat config) | Linting | Use the flat config (`eslint.config.js`). Plugins: `@typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`. Skip `eslint-plugin-react` for new projects (most rules redundant with TS). |
| Prettier 3 | Formatting | Single-source-of-truth formatter. Disable conflicting ESLint stylistic rules (`eslint-config-prettier`). |
| `tsx` (or `tsx watch`) | Run TS scripts | Needed for the build-time PokéAPI fetch script (see below). Use `tsx scripts/fetch-pokemon.ts`. |
| Vercel CLI | Local previews / deploys | Optional — Vercel's Git integration handles deploys automatically once the repo is connected. |
## Build-Time Data Fetching Strategy (concrete)
### 1. One-shot Node fetch script (committed output)
### 2. Run once, commit the JSON
### 3. Import as a typed module
### 4. Sprites stay live
### 5. Moves and evolution chains
## Stack Patterns by Variant
- Add **Immer** + **use-immer** on day one. Without it, Phase 2's reducer (level-ups mutating party slots, items modifying held items, status effects ticking down) becomes a maze of spread operators.
- Split state into two contexts: `RunContext` (volatile, per-run) and `MetaContext` (persistent: pokedex, settings). Two reducers, two providers. Avoids re-rendering the pokedex on every battle frame.
- Wrap pure children with `React.memo` and pass primitive props.
- React 19's automatic compiler memoization helps but isn't a free lunch — measure with the Profiler before optimizing.
- The Zod schemas you wrote for localStorage **are** your DB schemas. Drop them into a Supabase `jsonb` column and reuse `safeParse` server-side via Edge Functions.
## Version Compatibility (critical pinning notes)
| Combination | Notes |
|---|---|
| React 19 + `@types/react@^19` | Type defs changed in 19 — `@types/react@^18` will produce errors with React 19's new ref-as-prop. Use matching majors. |
| Tailwind v4 + Vite 6 | Use `@tailwindcss/vite` plugin (NOT `postcss` + `tailwindcss` like v3). Old v3 PostCSS-based setups break under v4. |
| Vitest 2 + Vite 6 | Compatible. Vitest 1.x with Vite 6 will warn — use Vitest 2. |
| `@testing-library/react@^16` + React 19 | RTL 16 is the React-19-compatible major. RTL 14/15 won't work cleanly with React 19. |
| `motion` vs `framer-motion` | `motion` (npm package) is the new home; `framer-motion@^11` is the same code under the old name. Don't install both. Pick `motion` for new code. |
| Node 20 LTS or 22 LTS | Required for Vite 6 (drops Node 18). Pin via `.nvmrc`. |
## Installation (Phase 1)
# Scaffold
# Core
# Tailwind v4 with Vite plugin
# State & validation
# Tests
# Build-time scripts
# Lint/format (optional but recommended)
### Phase 4 additions (defer until needed)
### `vite.config.ts` (Phase 1 starting point)
### `tsconfig.json` (key flags)
## Alternatives Considered
| Recommended | Alternative | When the alternative is better |
|---|---|---|
| Vite 6 | Next.js 15 / Remix | If you needed SSR or server functions. You don't — it's a client-side game. |
| React 19 | React 18 (user's pick) | If you depended on a library that hasn't shipped React 19 support. None of the libs in this stack have that issue. |
| Tailwind v4 | Tailwind v3 | If you have an existing v3 codebase to maintain. Greenfield → v4. |
| Tailwind v4 | CSS Modules / vanilla-extract | If you needed component-scoped CSS guarantees. Spec mandates Tailwind only. |
| Context + useReducer + Immer | Zustand | Zustand is genuinely simpler for this kind of state, but spec forbids it. Re-evaluate at v2. |
| Zod | Valibot | Valibot is ~10× smaller. Switch if bundle budget is critical. For now Zod's mindshare wins. |
| Motion | GSAP | GSAP is more powerful for non-React animations. Motion is React-native and lighter. |
| vite-plugin-pwa | Manual Workbox config | Plugin handles 95% of cases. Drop to manual only if you hit a precaching corner case. |
| Vitest | Jest | Jest works, but means a second config (Vitest already shares Vite's). No upside for greenfield. |
| jsdom | happy-dom | Speed only. Stick with jsdom default. |
| `@vitejs/plugin-react` | `@vitejs/plugin-react-swc` | SWC is faster. Switch if dev startup feels slow at scale (it won't for ~80 components). |
| Discriminated-union state machine for screens | react-router | Router for any URL-driven app. Not this one. |
| No state machine library | XState | XState is wonderful for complex flows. The battle phase is `select | animating | result` — three states. Not worth the dependency. |
## What NOT to Use
| Avoid | Why | Use Instead |
|---|---|---|
| Create React App (CRA) | Officially deprecated by React team. No HMR speed, no future updates. | Vite 6 |
| `tailwindcss@^3` for new projects | v4 is faster, has the official Vite plugin, and CSS-first config. | `tailwindcss@^4` + `@tailwindcss/vite` |
| `framer-motion` (the old npm name) | The package was renamed to `motion`. Same code, but new installs should use the new name to stay aligned with future updates. | `motion` |
| Runtime PokéAPI calls during gameplay | Network latency would freeze the battle UI; PokéAPI has no SLA. | Build-time fetch → JSON in bundle (see strategy above) |
| `useState` chains for nested run state | Will drown in spread operators by Phase 2. | `useReducer` + Immer |
| `redux-persist` / persistent-state libraries | Overkill for a single localStorage key. | A 20-line `useEffect(() => localStorage.setItem(...))` + Zod parse on load |
| Inline `<style>` or `*.css` files | Spec mandates Tailwind only. | Tailwind classes; `@layer` in `index.css` for the few global rules |
| `lodash` | 70 KB for utilities you can write in 5 lines, all of which are already in modern JS (`structuredClone`, `Array.from`, optional chaining). | Native ES2022 APIs |
| `axios` | `fetch` is fine. The build-time script is the only place you fetch. | `fetch` |
| `moment` / `date-fns` | The game has no date logic. | Nothing |
| `uuid` | If you need unique IDs for party members, `crypto.randomUUID()` is built into the browser and Node 20+. | `crypto.randomUUID()` |
| Sprite sheets / atlas tools | Official artwork is one PNG per Pokémon, served by GitHub-hosted CDN. Atlasing buys nothing for 151 sprites. | `<img loading="lazy">` + service-worker runtime cache |
## Confidence Assessment per Recommendation
| Recommendation | Confidence | Rationale |
|---|---|---|
| Vite 6 | HIGH | Industry standard for React+TS SPAs; user already chose it. |
| React 19.2 over 18 | HIGH | Verified via react.dev/blog (19.2 released 2025-10-01, React 18 in maintenance). |
| Tailwind v4.2 over v3 | HIGH | Verified via tailwindcss.com/blog (v4.0 GA 2025-01-22, v4.2 current). |
| `@tailwindcss/vite` over PostCSS | HIGH | This is Tailwind v4's official Vite path per the v4 launch post. |
| Immer + use-immer | HIGH | Best-fit pattern for Context+useReducer with deeply-nested state. |
| Zod for save/load + build-time validation | HIGH | Standard for schema-validated client storage; prevents stale-save crashes. |
| Motion (vs framer-motion name) | MEDIUM | Rename happened — verify the current npm package name with `npm view motion` before installing. If `framer-motion@^11` is still maintained, either works. |
| Vitest 2.x + RTL 16 | MEDIUM-HIGH | Pin majors as listed; check `vitest.dev` for the current minor. |
| vite-plugin-pwa | HIGH | The de-facto Vite PWA plugin; Workbox under the hood. |
| Build-time JSON fetch + commit | HIGH | Matches the spec's stated decision and standard SPA practice. |
| No router | HIGH | Aligned with `screen` enum already in the spec. |
## Open Validation Tasks (do before locking package.json)
- [ ] `npm view vite version` → confirm latest 6.x patch (or check if 7.x is stable enough to adopt)
- [ ] `npm view react version` → confirm 19.x latest patch
- [ ] `npm view tailwindcss version` and `npm view @tailwindcss/vite version` → confirm matched 4.x patches
- [ ] `npm view vitest version` → confirm 2.x latest patch (or 3.x if released)
- [ ] `npm view motion version` and `npm view framer-motion version` → confirm `motion` is the active package
- [ ] `npm view zod version` → if Zod 4 is stable, evaluate migration; otherwise pin `^3.23`
- [ ] `npm view immer version` and `npm view use-immer version`
- [ ] `npm view vite-plugin-pwa version`
- [ ] `npm view @testing-library/react version` → confirm 16.x is the React-19-compatible line
## Sources
- **react.dev/blog** (verified via WebFetch): React 19 stable since 2024-12-05; React 19.2 released 2025-10-01 — HIGH confidence
- **tailwindcss.com/blog** (verified via WebFetch): Tailwind v4.0 GA 2025-01-22, v4.1 (April 2025) added text shadows/masks, v4.2 current — HIGH confidence
- **poketrail.md** + **PROJECT.md** (read in full): user's stack constraints, game design, file structure
- **Training data (knowledge cutoff Jan 2026)** for Vite 6, Vitest 2, Zod 3, Immer 10, Motion rename, vite-plugin-pwa: MEDIUM confidence — pin via `npm view` before locking
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
