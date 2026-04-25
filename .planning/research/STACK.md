# Stack Research

**Domain:** Browser-based turn-based RPG (Pokémon-style roguelike, single-page React web app, no backend)
**Researched:** 2026-04-25
**Confidence:** MEDIUM-HIGH (versions for React 19, Tailwind v4 verified via official sources; remaining versions verified against training-data baseline — pin via `npm view` before installing)

> **Note on verification:** WebSearch and most WebFetch calls were unavailable in this sandboxed run. React 19.2 (released 2025-10-01) and Tailwind CSS v4.2 were verified via direct fetches from `react.dev/blog` and `tailwindcss.com/blog`. Other versions are stated at the major level the user should target — pin to the latest patch with `npm install <pkg>@latest` and audit with `npm outdated` before locking. Where I push back on a user choice, the rationale comes from observable industry shifts (Tailwind v4 ships a Vite plugin instead of PostCSS; Motion replaced framer-motion; React 19 became stable while React 18 entered maintenance).

---

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

---

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

---

## Build-Time Data Fetching Strategy (concrete)

This is the single most important architectural detail of the project. The spec is firm: **no runtime PokéAPI calls for gameplay**, only sprite URLs at runtime. Here is the recommended pipeline:

### 1. One-shot Node fetch script (committed output)

Create `scripts/fetch-pokemon-gen1.ts`:

```ts
// scripts/fetch-pokemon-gen1.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const POKEAPI = 'https://pokeapi.co/api/v2';
const GEN1_IDS = Array.from({ length: 151 }, (_, i) => i + 1);

// Validate API responses with Zod — fail loudly if PokéAPI shape changes
const PokemonResponse = z.object({
  id: z.number(),
  name: z.string(),
  types: z.array(z.object({ type: z.object({ name: z.string() }) })),
  stats: z.array(z.object({
    base_stat: z.number(),
    stat: z.object({ name: z.string() }),
  })),
  sprites: z.object({
    other: z.object({
      'official-artwork': z.object({ front_default: z.string().nullable() }),
    }),
  }),
});

async function fetchOne(id: number, retries = 3): Promise<unknown> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch(`${POKEAPI}/pokemon/${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (attempt === retries - 1) throw e;
      await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
    }
  }
}

// Throttle: PokéAPI fair-use says "be reasonable". 5 concurrent is safe.
async function pmap<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += n) {
    const batch = await Promise.all(items.slice(i, i + n).map(fn));
    results.push(...batch);
  }
  return results;
}

const raw = await pmap(GEN1_IDS, 5, fetchOne);
const validated = raw.map(r => PokemonResponse.parse(r));

// Transform to game-internal shape (the one in poketrail.md §4.3)
const transformed = validated.map(p => ({
  id: p.id,
  name: p.name,
  types: p.types.map(t => t.type.name),
  baseStats: {
    hp: p.stats.find(s => s.stat.name === 'hp')!.base_stat,
    attack: p.stats.find(s => s.stat.name === 'attack')!.base_stat,
    defense: p.stats.find(s => s.stat.name === 'defense')!.base_stat,
    spAttack: p.stats.find(s => s.stat.name === 'special-attack')!.base_stat,
    spDefense: p.stats.find(s => s.stat.name === 'special-defense')!.base_stat,
    speed: p.stats.find(s => s.stat.name === 'speed')!.base_stat,
  },
  sprite: p.sprites.other['official-artwork'].front_default,
  // moves + evolutionChain require additional endpoints — fetch those separately
}));

mkdirSync(resolve('src/data'), { recursive: true });
writeFileSync(
  resolve('src/data/pokemon-gen1.json'),
  JSON.stringify(transformed, null, 2),
);
console.log(`Wrote ${transformed.length} Pokémon`);
```

### 2. Run once, commit the JSON

```bash
npx tsx scripts/fetch-pokemon-gen1.ts
git add src/data/pokemon-gen1.json
git commit -m "data: snapshot Gen 1 from PokéAPI"
```

**Commit the JSON.** Do not refetch on every CI build — PokéAPI is community-run and you'd hammer it for no reason. Refetch manually only when you intentionally bump data (e.g. add moves). Add an npm script `"data:refresh": "tsx scripts/fetch-pokemon-gen1.ts"` for ergonomics.

### 3. Import as a typed module

```ts
// src/data/pokemon.ts
import raw from './pokemon-gen1.json';
import { z } from 'zod';

const PokemonSchema = z.object({ /* ... mirror of transform shape ... */ });
const PokemonArray = z.array(PokemonSchema);
export const POKEMON_GEN1 = PokemonArray.parse(raw); // throws at module init if data drifts from schema
export type Pokemon = z.infer<typeof PokemonSchema>;
```

Vite tree-shakes JSON imports and bundles them as part of the main chunk. For 151 Pokémon the JSON will be ~30–80 KB depending on how much movedata you include — well within budget.

### 4. Sprites stay live

Sprites are loaded by URL (`p.sprite`) using `<img loading="lazy" src={p.sprite}>`. PokéAPI's `raw.githubusercontent.com/PokeAPI/sprites/...` URLs are the actual hosting layer (CDN-backed by GitHub) — these are durable and cache well. The vite-plugin-pwa runtime cache (Phase 4) will give offline sprite support after first visit.

### 5. Moves and evolution chains

Run a separate `scripts/fetch-moves-gen1.ts` for moves (~165 Gen-1 moves) → `src/data/moves-gen1.json`. Evolution chains: fetch `/pokemon-species/{id}` then `/evolution-chain/{id}` to derive the `evolutionChain: number[]` and `evolveLevel`. Curate the moveset per Pokémon manually for game balance — PokéAPI returns the complete learnable list which is hundreds per Pokémon and won't make a fun roguelike loadout.

---

## Stack Patterns by Variant

**If you keep the spec's Context+useReducer constraint:**
- Add **Immer** + **use-immer** on day one. Without it, Phase 2's reducer (level-ups mutating party slots, items modifying held items, status effects ticking down) becomes a maze of spread operators.
- Split state into two contexts: `RunContext` (volatile, per-run) and `MetaContext` (persistent: pokedex, settings). Two reducers, two providers. Avoids re-rendering the pokedex on every battle frame.

**If render performance becomes an issue in battle animations:**
- Wrap pure children with `React.memo` and pass primitive props.
- React 19's automatic compiler memoization helps but isn't a free lunch — measure with the Profiler before optimizing.

**If you later want cloud save (post-v1):**
- The Zod schemas you wrote for localStorage **are** your DB schemas. Drop them into a Supabase `jsonb` column and reuse `safeParse` server-side via Edge Functions.

---

## Version Compatibility (critical pinning notes)

| Combination | Notes |
|---|---|
| React 19 + `@types/react@^19` | Type defs changed in 19 — `@types/react@^18` will produce errors with React 19's new ref-as-prop. Use matching majors. |
| Tailwind v4 + Vite 6 | Use `@tailwindcss/vite` plugin (NOT `postcss` + `tailwindcss` like v3). Old v3 PostCSS-based setups break under v4. |
| Vitest 2 + Vite 6 | Compatible. Vitest 1.x with Vite 6 will warn — use Vitest 2. |
| `@testing-library/react@^16` + React 19 | RTL 16 is the React-19-compatible major. RTL 14/15 won't work cleanly with React 19. |
| `motion` vs `framer-motion` | `motion` (npm package) is the new home; `framer-motion@^11` is the same code under the old name. Don't install both. Pick `motion` for new code. |
| Node 20 LTS or 22 LTS | Required for Vite 6 (drops Node 18). Pin via `.nvmrc`. |

---

## Installation (Phase 1)

```bash
# Scaffold
npm create vite@latest poketrail -- --template react-ts
cd poketrail

# Core
npm install react@^19 react-dom@^19
npm install -D @types/react@^19 @types/react-dom@^19
npm install -D typescript@^5.7

# Tailwind v4 with Vite plugin
npm install -D tailwindcss@^4 @tailwindcss/vite@^4

# State & validation
npm install immer use-immer zod@^3

# Tests
npm install -D vitest@^2 @testing-library/react@^16 @testing-library/jest-dom@^6 jsdom@^25

# Build-time scripts
npm install -D tsx

# Lint/format (optional but recommended)
npm install -D eslint@^9 @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-react-hooks eslint-plugin-react-refresh prettier eslint-config-prettier
```

### Phase 4 additions (defer until needed)

```bash
npm install motion              # animations
npm install -D vite-plugin-pwa  # installable + offline
npm install clsx tailwind-merge # dynamic className helpers (might be needed earlier)
```

### `vite.config.ts` (Phase 1 starting point)

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

### `tsconfig.json` (key flags)

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

`noUncheckedIndexedAccess` is the single most valuable strict flag for game code: it forces you to handle `team[i]` possibly being `undefined`, which is exactly the kind of bug that ships to production from "I know slot 3 has a Pokémon."

---

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

---

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

---

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

---

## Open Validation Tasks (do before locking package.json)

These need a live `npm view` or browser check that this sandboxed environment couldn't perform. None changes the architecture, only the version numbers:

- [ ] `npm view vite version` → confirm latest 6.x patch (or check if 7.x is stable enough to adopt)
- [ ] `npm view react version` → confirm 19.x latest patch
- [ ] `npm view tailwindcss version` and `npm view @tailwindcss/vite version` → confirm matched 4.x patches
- [ ] `npm view vitest version` → confirm 2.x latest patch (or 3.x if released)
- [ ] `npm view motion version` and `npm view framer-motion version` → confirm `motion` is the active package
- [ ] `npm view zod version` → if Zod 4 is stable, evaluate migration; otherwise pin `^3.23`
- [ ] `npm view immer version` and `npm view use-immer version`
- [ ] `npm view vite-plugin-pwa version`
- [ ] `npm view @testing-library/react version` → confirm 16.x is the React-19-compatible line

---

## Sources

- **react.dev/blog** (verified via WebFetch): React 19 stable since 2024-12-05; React 19.2 released 2025-10-01 — HIGH confidence
- **tailwindcss.com/blog** (verified via WebFetch): Tailwind v4.0 GA 2025-01-22, v4.1 (April 2025) added text shadows/masks, v4.2 current — HIGH confidence
- **poketrail.md** + **PROJECT.md** (read in full): user's stack constraints, game design, file structure
- **Training data (knowledge cutoff Jan 2026)** for Vite 6, Vitest 2, Zod 3, Immer 10, Motion rename, vite-plugin-pwa: MEDIUM confidence — pin via `npm view` before locking

---
*Stack research for: PokeTrail (Pokémon roguelike browser game)*
*Researched: 2026-04-25*
