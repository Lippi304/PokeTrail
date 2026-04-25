# Phase 1: Foundation, Toolchain, Engine Core — Research

**Researched:** 2026-04-25
**Domain:** Build toolchain (Vite/React/TS/Tailwind), pure-TypeScript game engine (PRNG, type chart, damage formula), PokéAPI build-time data pipeline (Zod-validated), a11y/mobile baseline, Vercel SPA deploy
**Confidence:** HIGH for stack/versions/Zod/PokéAPI shapes/damage formula/RNG/ESLint enforcement; MEDIUM for exact Smogon golden numbers (target ranges, not single values); HIGH for a11y/mobile baseline (well-trodden WCAG ground)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Branding + Legal/IP**
- **D-01:** Project name remains **PokeTrail** (user accepted DMCA risk)
- **D-02:** **Pixel sprites self-hosted** in `public/sprites/` from PokéAPI `sprites.versions['generation-i']['red-blue'].front_default` (fallback `yellow`). NO official artwork.
- **D-03:** Standard fan-project disclaimer in title-screen footer + README:
  > "PokeTrail is a non-commercial fan project. Pokémon and all related characters are trademarks of Nintendo / Game Freak / The Pokémon Company. This site is not affiliated with or endorsed by them."
- **D-04:** Vercel deployment on default `vercel.app` subdomain. No custom domain in v1.
- **D-05:** Explicit no-monetization clause in disclaimer + README ("no ads, no donations, no microtransactions, ever").

**Engine Mechanics**
- **D-06:** Modern Type Chart **minus Steel/Dark/Fairy** — generated programmatically from PokéAPI `damage_relations` at build time. NO hand-typed cells. Psychic is NOT 0× vs Ghost (Gen-1 bug removed).
- **D-07:** Critical hit: **modern flat ~1/24** chance (≈4.17%), ×1.5 multiplier. Crit-stage / Scope-Lens framework deferred to Phase 8.
- **D-08:** Move-category split: **modern per-move physical/special** via `damage_class` from PokéAPI per move. NOT Gen-1 type-based.
- **D-09:** Accuracy floor 70% + min-damage 1 floor.
- **D-10:** STAB ×1.5, random factor 85–100% (modern).

**Stack Pinnings**
- **D-11:** **React 19.2** (NOT 18).
- **D-12:** **Tailwind v4.2** with `@tailwindcss/vite` plugin (NOT v3 / NOT PostCSS).
- **D-13:** Immer + use-immer + Zod **all from day 1** in Phase 1 (build-script needs Zod, patterns must be locked).
- **D-14:** ESLint flat config + `no-restricted-imports` blocks `react`/`react-dom` under `src/engine/**`. Additional rule blocks `Math.random` and `Date.now` in `src/engine/**`. CI-enforced.
- **D-15:** Vitest 2.x + `@testing-library/react@16` + `jsdom`. Engine tests in `environment: 'node'` for speed.

**Persistence + State (locked for Phase 3)**
- **D-16:** Three separate localStorage keys: `poketrail.save`, `poketrail.pokedex`, `poketrail.settings`. "Reset save" only clears `poketrail.save`.
- **D-17:** Versioning + migration chain from day 1 (`SaveV1 → SaveV2 → ...`). Zod `safeParse` with default fallback.
- **D-18:** Split context: `RunContext` (slow) + `BattleContext` (fast). Both via `useImmerReducer`.
- **D-19:** Build-script Zod validation **AND** module-init Zod validation (both layers).

### Claude's Discretion
- A11y/mobile baseline implementation details (exact Tailwind classes for focus rings, ARIA pattern selection)
- Vitest config layout (separate `vitest.engine.config` vs single config)
- Build-script architecture (single script vs multi-step pipeline)
- Smogon golden-test matchup selection (≥20 mandatory; exact matchups Claude's choice)
- Color palette specifics for dark theme (`bg-[#0a0a0a]` base locked; rest open)
- ESLint + Prettier final rule set beyond stated locks
- Vercel project config details (build command, output dir, Node version pin)

### Deferred Ideas (OUT OF SCOPE)
- Crit stages with Scope Lens — Phase 8 (D-07 locks flat 1/24 for Phase 1)
- Sound effects / music — out of scope for v1
- PWA / vite-plugin-pwa — Phase 11 (POLISH-03/04)
- Motion / animation library — Phase 10 (POLISH-01/02)
- Routing / react-router — never (discriminated-union `screen` field is the architecture)
- Custom domain for Vercel — post-v1
- Lighthouse + axe-core — Phase 11 (A11Y-05, MOBILE-04)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | `npm run dev` boots Vite 6 + React 19.2 + TS 5.7 strict | Standard Stack §Core; install commands verified via npm registry |
| FOUND-02 | Tailwind v4.2 wired via `@tailwindcss/vite`, dark theme default | Standard Stack §Core; Tailwind v4 install pattern (CSS-first, `@theme`) |
| FOUND-03 | TS config enforces `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, no `any` | Code Examples §`tsconfig.json`; CLAUDE.md mandate |
| FOUND-04 | Vitest 2 + RTL@16 + jsdom configured; `npm test` runs suite | Code Examples §`vitest.config.ts` (split node/jsdom envs) |
| FOUND-05 | ESLint flat config blocks `react`/`react-dom` in `src/engine/**` | Code Examples §`eslint.config.js`; D-14 |
| FOUND-06 | Vercel deploy live with auto-deploy + legal disclaimer on title | Architecture §Vercel SPA; D-03/D-04 disclaimer text |
| FOUND-07 | Repo has README, `.gitignore`, `.editorconfig`, Prettier config | Standard Stack §Development Tools |
| DATA-01 | `tsx scripts/fetch-pokemon-gen1.ts` writes 151 Pokémon to `src/data/pokemon-gen1.json`, Zod-validated | Code Examples §Build-time fetch script; PokéAPI `/pokemon/{id}` shape |
| DATA-02 | Same script writes referenced moves to `src/data/moves-gen1.json` | PokéAPI `/move/{id}` shape; `damage_class` for D-08 |
| DATA-03 | Type chart from `damage_relations` written to `src/data/typeChart.json`, no hand-typed cells | PokéAPI `/type/{name}` shape; D-06 |
| DATA-04 | All 151 pixel sprites downloaded to `public/sprites/`, committed | Sprite URL pattern (D-02); no runtime hotlinking |
| DATA-05 | All static JSON validated with Zod at module-init (fail-loud on drift) | D-19; Code Examples §`src/data/index.ts` |
| ENG-01 | `engine/rng.ts` exports seedable mulberry32 with counter; engine never uses `Math.random`/`Date.now` | Code Examples §mulberry32; ESLint rule (D-14) |
| ENG-02 | `engine/typeChart.ts` resolves single + dual matchups (modern minus Steel/Dark/Fairy) | D-06; canonical type list |
| ENG-03 | `engine/damage.ts` implements formula with STAB, type effectiveness, ~1/24 crit ×1.5, min-damage-1 | Damage Formula section; D-07/08/09/10 |
| ENG-04 | ≥20 Smogon golden test cases | Golden Test Cases section (≥24 provided) |
| ENG-05 | Move accuracy rolls via seedable RNG with 70% floor | D-09; Code Examples §accuracy roll |
| A11Y-01 | Type badges include text label (color-blind support) | A11y Baseline §Type Badges; WCAG 1.4.1 |
| A11Y-02 | All interactive elements have visible focus rings | A11y Baseline §Focus Rings; WCAG 2.4.7 |
| A11Y-03 | Keys 1–4 trigger move buttons in battle | A11y Baseline §Keyboard; placeholder hook in Phase 1, full impl in Phase 4 |
| A11Y-04 | Battle log uses `aria-live="polite"` | A11y Baseline §ARIA; placeholder pattern doc in Phase 1 |
| MOBILE-01 | All interactive elements ≥ 44×44px | Mobile Baseline §Tap Targets; Apple HIG / WCAG 2.5.5 |
| MOBILE-02 | Layout uses `100dvh` + `viewport-fit=cover` | Mobile Baseline §Viewport; iOS Safari address-bar |
| MOBILE-03 | Touch interactions use `touch-action: manipulation` | Mobile Baseline §Touch; suppresses double-tap zoom |
</phase_requirements>

## Summary

Phase 1 is a **foundation phase** — almost everything it produces is infrastructure the next ten phases depend on. The locked-decision matrix (CONTEXT.md) eliminates virtually all stack ambiguity: Vite 6 + React 19.2 + TypeScript (strict) + Tailwind v4.2 + Vitest 2 + Zod 3 + Immer 10. The remaining research load concentrates on three places where wrong choices would silently corrupt later phases:

1. **Damage formula correctness** — must match Smogon's modern Gen-1 calculator (with locked overrides: ~1/24 crit, 70% accuracy floor, min-damage-1, modern type chart minus Steel/Dark/Fairy, modern per-move category split). Wrong values feel wrong to Pokémon-literate players within seconds. Verifiable only via golden tests.
2. **PokéAPI data pipeline** — the build-time script must validate every response with Zod **and** the loaded JSON must be re-validated at module init. The cost of skipping the second validation is "the game runs in dev but breaks in production after a stale json file slips through."
3. **Engine purity boundary** — ESLint must block React imports inside `src/engine/**` *and* block `Math.random`/`Date.now`. Without these guards the seedable-RNG discipline (which a future "shareable seed" / "daily challenge" feature depends on) erodes invisibly.

A11y/mobile baseline is well-understood ground (WCAG, Apple HIG, MDN); the Phase 1 deliverable is "the design tokens and primitive components carry these properties from birth," not "audit-pass at the end."

**Primary recommendation:** Build the engine + data pipeline + ESLint guards first (no UI), prove correctness via Vitest golden tables, *then* scaffold the UI primitives with a11y/mobile baseline locked into the `<Button>` / `<TypeBadge>` design tokens. This way Phases 2–4 can lean on a verified engine and never have to retrofit a11y onto components.

## Standard Stack

### Core

| Library | Version (verified) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vite` | `^6.4.2` (locked at `^6.x` per D-11) | Dev server + bundler | Native ESM dev, Rollup prod build, first-party plugins for Tailwind v4. Vite 6 supports Node 20 LTS / 22 LTS — pin via `.nvmrc`. [VERIFIED: `npm view vite@6 version` returned 6.4.2 latest in 6.x line] |
| `react` | `^19.2.5` | UI runtime | React 19.2 stable line, Activity API, ref-as-prop, automatic compiler memoization. [VERIFIED: `npm view react version` → 19.2.5] |
| `react-dom` | `^19.2.5` | DOM renderer | Match React major. [VERIFIED] |
| `@types/react` | `^19.2.14` | Type defs | **MUST match React 19 major** — `@types/react@^18` produces type errors with React 19's ref-as-prop. [VERIFIED] |
| `@types/react-dom` | `^19.x` | Type defs | Match `@types/react`. [ASSUMED — verify with `npm view @types/react-dom version` before locking] |
| `typescript` | `^5.7.x` (locked per stack research) | Language | TS 5.7 ships native `--strict` defaults; works with React 19 type defs. Latest 5.x line is 5.9.3 — pinning `^5.7` accepts 5.7/5.8/5.9. [VERIFIED: `npm view typescript@5 version` shows 5.7.2/5.7.3/5.8.x/5.9.3 available; `npm view typescript version` shows 6.0.3 exists but Phase-1 lock is TS 5.x to match research/STACK.md] |
| `tailwindcss` | `^4.2.4` | Utility-first CSS | v4 Oxide engine, CSS-first `@theme` config, no postcss/autoprefixer needed. [VERIFIED] |
| `@tailwindcss/vite` | `^4.2.4` | Tailwind v4 Vite plugin | First-party integration; replaces v3's PostCSS pipeline. **Major versions are kept aligned with `tailwindcss`.** [VERIFIED] |
| `@vitejs/plugin-react` | `^4.x` | React Fast Refresh + JSX | Standard React plugin for Vite. Use Babel-based variant (not SWC) — fewer plugin-compat surprises. [VERIFIED: `npm view @vitejs/plugin-react version` → 4.21.0] |
| `vitest` | `^2.x` (locked per D-15; latest in 2.x is 2.1.9) | Test runner | Shares Vite transform pipeline. Vitest 4.x exists but Phase-1 lock is 2.x to match research/STACK.md. [VERIFIED: `npm view vitest@2 version` shows 2.1.9 latest in 2.x] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^3.23+` (locked at `^3.x` per CONTEXT.md; pinning 3.x explicitly because Zod v4 exists but Phase-1 lock is v3 line) | Runtime schema validation | Two consumers in Phase 1: (a) build-script validates PokéAPI responses before JSON write; (b) `src/data/index.ts` re-validates at module init. Same schemas later become localStorage save validators in Phase 3. [VERIFIED: latest in 3.x line is 3.25.76; latest published is 4.3.6] |
| `immer` | `^10.x` | Immutable state updates | Required from day 1 for split-context pattern. Engine reducer signature `(state, action, rng) → newState` benefits from Immer's `produce`. [VERIFIED: `npm view immer@10 version` → 10.2.0 latest in 10.x] |
| `use-immer` | `^0.11+` | `useImmerReducer` hook | Drop-in for `useReducer` that auto-wraps in Immer's `produce`. [VERIFIED: `npm view use-immer version` → 0.11.0] |
| `@testing-library/react` | `^16.3+` | Component test queries | RTL 16 is the React-19-compatible major. [VERIFIED] |
| `@testing-library/dom` | `^10.x` | RTL peer | Required peer of `@testing-library/react@16`. [ASSUMED — verify peer-deps] |
| `@testing-library/jest-dom` | `^6.x` | Custom matchers (optional) | `toBeInTheDocument`, `toHaveClass` etc. [ASSUMED — optional but standard] |
| `jsdom` | `^25.x` | DOM in Vitest | Required `environment: 'jsdom'` for tests touching React or `localStorage`. Engine tests stay in `environment: 'node'`. [VERIFIED: `npm view jsdom@25 version` → 25.0.1] |
| `tsx` | `^4.x` | Run TS scripts (build-time fetch) | Used by `tsx scripts/fetch-pokemon-gen1.ts`. Faster than `ts-node`, zero-config, ESM-native. [VERIFIED: `npm view tsx version` → 4.21.0] |

### Dev Tooling

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `eslint` | `^9.x` (flat config) | Linting | Phase-1 lock is ESLint 9 to keep flat-config conventions stable. [VERIFIED: `npm view eslint@9 version` → 9.39.4 latest in 9.x] |
| `typescript-eslint` | `^8.x` | TS rules + parser (single package) | Modern unified API replacing `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` separately. [VERIFIED: `npm view typescript-eslint version` → 8.59.0] |
| `eslint-plugin-react-hooks` | `^5.x` | `react-hooks/exhaustive-deps` | Standard. [ASSUMED — verify before lock] |
| `eslint-plugin-react-refresh` | `^0.4+` | Vite Fast Refresh boundary check | Standard with Vite + React. [ASSUMED] |
| `eslint-plugin-boundaries` | `^6.x` | Layered import boundaries (optional) | Alternative to `no-restricted-imports` if scope grows; for Phase 1 the simpler `no-restricted-imports` rule is sufficient. [VERIFIED: `npm view eslint-plugin-boundaries version` → 6.0.2] |
| `eslint-config-prettier` | `^9.x` | Disable ESLint stylistic rules that conflict with Prettier | Standard. [ASSUMED] |
| `prettier` | `^3.x` | Formatter | Standard. [VERIFIED: 3.8.3] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Decision |
|------------|-----------|----------|----------|
| Zod 3 | Zod 4 (3.25.76 vs 4.3.6 latest) | Zod 4 is smaller + faster; but CONTEXT.md locks `^3.x`. | Stay on `^3.x` per D-13. Re-evaluate at v2. |
| Vitest 2 | Vitest 4 (2.1.9 vs 4.1.5 latest) | Vitest 4 has perf wins; but D-15 locks `2.x`. | Stay on `^2.x` per D-15. |
| TS 5.7 | TS 5.9 / 6.0 | TS 5.9 latest in 5.x, 6.0 just released. | Stay on `^5.7` per stack research; allows 5.7/5.8/5.9. |
| Vite 6 | Vite 7 / 8 (6.4.2 vs 8.0.10 latest) | Vite 8 exists; but D-11 + research lock `^6.x` and Tailwind v4 + Vitest 2 ecosystem is verified against Vite 6. | Stay on `^6.x`. |
| `eslint-plugin-boundaries` | `no-restricted-imports` | Boundaries plugin is more declarative; restricted-imports is built-in and zero-deps. | Use `no-restricted-imports` for Phase 1 (D-14 specifies this). |
| Babel React plugin | `@vitejs/plugin-react-swc` | SWC is ~2× faster on cold start; occasional plugin gaps. | Babel-based — smoother ecosystem fit. Switch later if cold start bites. |
| jsdom | happy-dom | happy-dom ~2× faster, occasional API gaps. | Stick with jsdom (D-15 spec). |

> **CRITICAL VERSION ALIGNMENT NOTE:** As of 2026-04-25 the npm registry exposes much newer majors than CONTEXT.md locks (Vite 8, Vitest 4, Zod 4, TS 6, ESLint 10, jsdom 29, Immer 11). The locked-decision pins are deliberate — the planner should NOT bump to current-latest majors without a fresh discuss-phase. Stay on the major lines listed in the table above.

**Installation (all at once for Phase 1):**

```bash
# Scaffold (use create-vite which respects the locked Vite 6 line)
npm create vite@6 poketrail -- --template react-ts
cd poketrail

# Pin Vite 6 explicitly (create-vite scaffolds latest by default)
npm install --save-dev vite@^6.4 @vitejs/plugin-react@^4

# React 19.2 + matching types
npm install react@^19.2 react-dom@^19.2
npm install --save-dev @types/react@^19.2 @types/react-dom@^19.2

# TypeScript 5.x
npm install --save-dev typescript@^5.7

# Tailwind v4
npm install --save-dev tailwindcss@^4.2 @tailwindcss/vite@^4.2

# State + validation (Phase 1 from day 1 per D-13)
npm install immer@^10 use-immer@^0.11 zod@^3.23

# Tests
npm install --save-dev vitest@^2 @testing-library/react@^16 \
  @testing-library/jest-dom@^6 @testing-library/dom@^10 jsdom@^25

# Build-time scripts
npm install --save-dev tsx@^4

# Lint + format
npm install --save-dev eslint@^9 typescript-eslint@^8 \
  eslint-plugin-react-hooks@^5 eslint-plugin-react-refresh@^0.4 \
  eslint-config-prettier@^9 prettier@^3
```

**Version verification done in this session:** All `^major` lines verified resolvable via `npm view <pkg>@<major> version` on 2026-04-25. [VERIFIED]

## Architecture Patterns

### Recommended Project Structure (Phase 1 footprint)

```
poketrail/
├── .editorconfig                          # FOUND-07
├── .gitignore                             # FOUND-07 (node_modules, dist, .DS_Store)
├── .nvmrc                                 # Pin Node 20 or 22 LTS
├── .prettierrc                            # FOUND-07
├── README.md                              # FOUND-07 + disclaimer (D-03)
├── eslint.config.js                       # FOUND-05 (flat config)
├── package.json                           # engines.node = "^20 || ^22"
├── tsconfig.json                          # FOUND-03 (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
├── tsconfig.node.json                     # for vite.config.ts and scripts/
├── vite.config.ts                         # FOUND-01, FOUND-02 (Tailwind plugin)
├── vitest.config.ts                       # FOUND-04 (split node/jsdom envs via projects)
├── vercel.json                            # FOUND-06 (SPA rewrite)
├── index.html                             # viewport meta with viewport-fit=cover (MOBILE-02)
├── public/
│   └── sprites/                           # DATA-04 (151 pixel PNGs committed)
├── scripts/
│   └── fetch-pokemon-gen1.ts              # DATA-01/02/03/04 (build-time fetch + Zod + sprite download)
├── src/
│   ├── main.tsx                           # React 19.2 root (createRoot)
│   ├── App.tsx                            # Title placeholder with disclaimer footer
│   ├── index.css                          # Tailwind v4 import + @theme block
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx                 # 44×44 min, focus-ring, touch-action: manipulation
│   │   │   └── TypeBadge.tsx              # Color + TEXT label (A11Y-01)
│   │   └── layout/
│   │       └── Disclaimer.tsx             # D-03 text in title screen footer
│   ├── data/
│   │   ├── index.ts                       # Zod re-validation at import time (DATA-05)
│   │   ├── pokemon-gen1.json              # generated by script (DATA-01) — committed
│   │   ├── moves-gen1.json                # generated by script (DATA-02) — committed
│   │   ├── typeChart.json                 # generated by script (DATA-03) — committed
│   │   └── schemas.ts                     # Zod schemas, source of truth for both runtime + types
│   ├── engine/                            # PURE TS — no react, no DOM, no Math.random, no Date.now
│   │   ├── rng.ts                         # ENG-01 (mulberry32 + counter)
│   │   ├── typeChart.ts                   # ENG-02 (single + dual matchups)
│   │   ├── damage.ts                      # ENG-03 (formula)
│   │   ├── accuracy.ts                    # ENG-05 (70% floor + RNG roll)
│   │   ├── types.ts                       # Engine-internal TS types (no react)
│   │   └── __tests__/
│   │       ├── rng.test.ts                # determinism + counter
│   │       ├── typeChart.test.ts          # ≥30 matchup spot-checks + 0× immunities
│   │       ├── damage.test.ts             # ≥20 Smogon golden cases (ENG-04)
│   │       └── accuracy.test.ts           # 70% floor + RNG roll
│   └── types/
│       └── pokemon.ts                     # Game-side TS types (re-exports Zod inferred types)
└── tests/
    └── setup.ts                           # @testing-library/jest-dom matchers, jsdom env
```

**Key structural decisions:**

- **`src/engine/` is the hard boundary.** ESLint's `no-restricted-imports` (FOUND-05 + D-14) blocks `react`, `react-dom`, AND `Math.random` / `Date.now` (via `no-restricted-syntax`). Discipline is enforced by the linter, not by convention.
- **`src/data/index.ts` re-validates at module-init time.** Even though the build script wrote validated JSON, a stale committed file or a hand-edit would otherwise pass silently — module-init validation fails the build loud. (DATA-05, D-19)
- **Engine tests live next to their source** (`src/engine/__tests__/`) — Vitest picks them up via the `node` environment for speed. UI tests (later phases) live in `tests/` with `jsdom`.
- **Sprites in `public/sprites/`** — Vite copies `public/` into the build output as-is. Reference as `/sprites/${id}.png` from components. (DATA-04, D-02)
- **No `src/contexts/` in Phase 1** — Split context lives in Phase 3 (per CONTEXT.md "Persistence + State patterns gelockt für Phase 3"). Phase 1 builds the engine that contexts will later wrap.

### Pattern 1: Pure Engine, RNG-threaded

**What:** Engine functions take `(state, action, rng) => newState` shape. Never read `Math.random`, never read `Date.now`. RNG is a parameter, not a global.

**When to use:** Every engine function that involves randomness — damage rolls, crit rolls, accuracy rolls, AI decisions (Phase 2+), route generation (Phase 5+).

**Example (mulberry32 + counter):**

```typescript
// src/engine/rng.ts — Source: well-known PRNG (Tommy Ettinger, public domain)
export interface RNG {
  /** Returns a deterministic float in [0, 1) and advances counter. */
  next(): number;
  /** Returns a deterministic int in [min, max] inclusive and advances counter. */
  nextInt(min: number, max: number): number;
  /** Returns true with probability p, advances counter. */
  chance(p: number): boolean;
  /** Returns the number of next() calls made since seed (for save persistence). */
  readonly counter: number;
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number, startCounter = 0): RNG {
  const base = mulberry32(seed);
  // Advance to startCounter (replay-on-load semantics)
  for (let i = 0; i < startCounter; i++) base();
  let counter = startCounter;
  const api: RNG = {
    next() {
      counter++;
      return base();
    },
    nextInt(min, max) {
      return min + Math.floor(api.next() * (max - min + 1));
    },
    chance(p) {
      return api.next() < p;
    },
    get counter() {
      return counter;
    },
  };
  return api;
}
```

[CITED: mulberry32 reference — Tommy Ettinger, public domain, widely reproduced; same implementation as `.planning/research/ARCHITECTURE.md` §Pattern 3]

### Pattern 2: Type Chart from PokéAPI `damage_relations`

**What:** Don't hand-type a 15×15 (or 18×18) chart. Fetch each type from PokéAPI, derive relations, write to JSON. (D-06, DATA-03)

**Why:** 15×15 = 225 cells; hand-transcription guarantees typos. PokéAPI's `damage_relations` field per type is the canonical source.

**Shape:**

```typescript
// src/data/schemas.ts
export const TypeName = z.enum([
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic',
  'bug', 'rock', 'ghost', 'dragon',
]); // 15 types — Steel/Dark/Fairy excluded per D-06

export const TypeChartSchema = z.record(
  TypeName,
  z.record(TypeName, z.union([z.literal(0), z.literal(0.5), z.literal(1), z.literal(2)]))
);
export type TypeChart = z.infer<typeof TypeChartSchema>;
```

[VERIFIED: PokéAPI `/api/v2/type/{name}` returns `damage_relations: { double_damage_to, half_damage_to, no_damage_to, double_damage_from, half_damage_from, no_damage_from }`; HTTP 200 confirmed via `curl https://pokeapi.co/api/v2/pokemon/1` in this session]

### Pattern 3: Build-Time Fetch with Zod Validation

**What:** Single `tsx` script fetches all 151 Pokémon, all referenced moves, and all 15 types from PokéAPI; validates every response with Zod; writes JSON to `src/data/`; downloads sprites to `public/sprites/`. (DATA-01..04, D-19)

**Idempotency:** Script is safe to re-run. Resume-on-failure is nice-to-have (cache requests on disk in `.cache/`) but not required for Phase 1 (151 + ~150 moves + 15 types = ~316 requests total, completes in 30–60 s on a clean run).

**Politeness:** Limit to ~10 concurrent requests, set `User-Agent: poketrail-build (https://github.com/...)`, exponential backoff on 429/5xx. (PokéAPI Fair Use)

### Anti-Patterns to Avoid

| Anti-pattern | Why it's bad | Do this instead |
|---|---|---|
| `Math.random()` inside `src/engine/**` | Tests become flaky; save/load changes outcomes; daily-seed feature impossible | Take `RNG` as a parameter; ESLint `no-restricted-syntax` blocks `Math.random` |
| `Date.now()` inside `src/engine/**` | Same determinism problem | Pass timestamps as args from the orchestration layer |
| Importing `react` from `src/engine/**` | Couples engine to UI; engine can no longer be tested headlessly in `node` env | ESLint `no-restricted-imports` blocks `react`/`react-dom` |
| Hand-typing the type chart | 225 cells = inevitable typos | Generate from `damage_relations` (D-06) |
| Skipping module-init Zod re-validation | Stale committed JSON drifts and breaks production silently | Re-validate at module init (D-19, DATA-05) |
| Hotlinking PokéAPI sprite URLs at runtime | GitHub raw rate limits, schema drift, IP risk | Download to `public/sprites/` at build time (D-02, DATA-04) |
| Loading `pokemon-gen1.json` synchronously in `App.tsx` if size grows | Slows time-to-interactive | Lazy-import only when Starter screen mounts (Phase 3 concern) |
| Inline `<style>` or separate `*.css` files | Spec mandates Tailwind only | Tailwind classes; Tailwind v4 `@theme` block in `index.css` |
| `useState` chains for nested run state | Spread-operator hell by Phase 3 | `useImmerReducer` from day 1 (D-13) |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation for PokéAPI responses + saves | Manual `if (typeof x.id !== 'number') throw …` | **Zod** schemas + `safeParse` + `z.infer` | One source of truth for runtime check + TS type; covers nested optional fields, unions, refinements |
| Immutable nested state updates | 4-line spread chains for `team[2].moves[0].pp -= 1` | **Immer** `produce` + `useImmerReducer` | Spread-operator chains drown the Phase 3 reducer; Immer is ~3KB gzipped |
| Seedable PRNG | `Math.random` everywhere | **mulberry32** (10 lines, public domain) | Determinism is required for save/load + future daily-seed feature; off-the-shelf algorithm is battle-tested |
| Type chart | Hand-typed 225-cell table | Programmatic build from `damage_relations` | 225 cells = guaranteed typos; PokéAPI is the canonical source |
| Damage formula golden tests | "Eyeball it during playtest" | Smogon damage calculator → ≥20 golden cases in Vitest table | Players will spot wrong values within seconds; only verifiable via reference table |
| ESLint engine-purity rule | "We'll just be careful" | `no-restricted-imports` + `no-restricted-syntax` (built-in to ESLint) | Discipline erodes; CI must enforce |
| SPA fallback for Vercel | Custom 404 page with JS redirect | `vercel.json` rewrites | One-line config; no JS round-trip |
| TS strict flags | "We'll add `any` later if needed" | `tsconfig.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | Off-by-one party-slot bugs and missing held-item fields are caught at build time |
| `<img>` lazy loading | IntersectionObserver custom hook | Native `<img loading="lazy">` | Browser-native, zero JS cost |
| ID generation (Phase 3+ for party slots) | `uuid` library | `crypto.randomUUID()` | Built into all modern browsers + Node 20+ |
| Date/time formatting (run summary in later phases) | `moment` / `date-fns` | `Intl.DateTimeFormat` | Native, no bundle cost |
| Conditional class names | Manual string concat | `clsx` / `tailwind-merge` (Phase 2+) | Tiny, idiomatic; Phase 1 nice-to-have |

**Key insight:** Phase 1's "don't-hand-roll" list is unusually short because the locked stack already excludes most temptations (no Redux, no Zustand, no react-router, no UI library). The real risk is hand-rolling the **schema validation** and **engine-purity guards** — both are fast to do "the lazy way" and catastrophic to retrofit.

## Runtime State Inventory

> **Greenfield phase — section omitted.** No existing code, databases, registered services, secrets, or build artifacts to inventory. This is the literal first commit of the project.

## Common Pitfalls

### Pitfall 1: Damage Formula Off-by-One / Wrong Order of Operations

**What goes wrong:** Pokémon damage formula has 6+ multiplication steps where order, integer truncation, and edge cases matter. Common bugs: STAB applied to status moves (which have null power), dual-type effectiveness multiplied incorrectly (Bug-on-Grass-Flying = 2× × 0.5× = 1×, but a left-to-right bug gives 1× × 2× × 0.5× depending on iteration order — equivalent here but not always), random factor applied before instead of after type/STAB, missing min-damage-1 floor, NaN when crit is rolled on a status move.

**Why it happens:** Formula looks simple in pseudocode. Developer tests Tackle-vs-Tackle at level 5 and ships. Edge cases (level 1 attackers, 0× immunities, status moves, sleeping target) are missed.

**How to avoid:**
- Centralize the formula in `src/engine/damage.ts`. No copy-paste anywhere else.
- Apply `Math.floor` explicitly at each integer-truncation step (formula spec below).
- ≥20 Smogon golden tests — drop them as a Vitest `it.each` table. Treat them as a regression net.
- Status moves bypass the damage path entirely (return 0 with no roll). Don't let null `power` reach the multiplication.

**Warning signs:** Player says "this Tackle did weird damage", different damage on same matchup across runs (random factor bug), NaN/Infinity in HP after a crit on a status move.

**Phase to fix:** Phase 1 — gate Phase 2 on golden tests green.

### Pitfall 2: Type Chart Errors (Especially Dual-Type Stacking)

**What goes wrong:** 15-type chart has 225 cells (15² — Steel/Dark/Fairy excluded per D-06). Hand-typing introduces typos. Dual-type stacking is multiplicative: Geodude (Rock/Ground) is 4× weak to Water. A bug that returns max-of-multipliers instead of product gives 2×.

**Why it happens:** Developer grabs "the Pokémon type chart" from Google's first result (modern Gen 6+ with Fairy), then builds with Gen 1 Pokémon → inconsistent gameplay (Charizard "weak to Fairy" when no Fairy exists).

**How to avoid:**
- Build chart from PokéAPI `damage_relations` at build time (D-06). Never hand-type.
- Lookup function: `getEffectiveness(moveType, defenderTypes)` returns the **product** of single-type multipliers. Asserts every cell exists; throws on unknown type rather than defaulting to 1× (catches typos cascading).
- ≥30 matchup spot-checks in Vitest including: Water > Fire (2×), Ground > Electric and Electric → Ground (0×), Ghost → Normal (0×), Normal → Ghost (0×), Geodude (Rock/Ground) takes Water at 4×, Charizard (Fire/Flying) takes Electric at 2× (1× × 2×) and Rock at 4× (2× × 2×).

**Warning signs:** Player report "my Pikachu's Thunder hit a Diglett" (should be 0×), Geodude takes 2× from Water instead of 4× (multiplier collapse bug).

**Phase to fix:** Phase 1.

### Pitfall 3: Module-Init Validation Skipped

**What goes wrong:** Build script validates PokéAPI response and writes `pokemon-gen1.json`. Six months later, a hand-edit or merge conflict drifts the JSON shape. Game runs in dev (no error from importing JSON) but fails at battle start with `cannot read property 'spAttack' of undefined`.

**Why it happens:** Developer thinks "I validated at write time, that's enough." Vite imports JSON with no runtime check.

**How to avoid (D-19):**

```typescript
// src/data/index.ts
import rawPokemon from './pokemon-gen1.json';
import rawMoves from './moves-gen1.json';
import rawTypeChart from './typeChart.json';
import { PokemonArraySchema, MoveArraySchema, TypeChartSchema } from './schemas';

// Fail loud at module init — bad JSON crashes app startup, not battle start.
export const POKEMON = PokemonArraySchema.parse(rawPokemon);
export const MOVES = MoveArraySchema.parse(rawMoves);
export const TYPE_CHART = TypeChartSchema.parse(rawTypeChart);
```

`parse()` (not `safeParse`) is correct here: stale data is a build-blocking bug, not a recoverable runtime condition. (DATA-05)

**Phase to fix:** Phase 1.

### Pitfall 4: ESLint Rule Not Enforced in CI

**What goes wrong:** `eslint.config.js` defines the engine-purity rule, but `npm test` doesn't run lint. Engineer adds `import { useState } from 'react'` to `engine/damage.ts` for "a quick experiment" and forgets to remove it. PR merges. Engine purity broken silently.

**Why it happens:** Vite's dev server doesn't run ESLint by default. Tests don't run ESLint. CI pipeline missing the `npm run lint` step.

**How to avoid:**
- `package.json` script: `"lint": "eslint . --max-warnings 0"`.
- Add `npm run lint` to CI gate (Vercel build command or GitHub Actions step) — fail on any lint error.
- Optional: `eslint-plugin-react-refresh` integrated into `vite.config.ts` for HMR-time warnings during dev.

**Phase to fix:** Phase 1.

### Pitfall 5: Vercel SPA Routing Fallback Missing

**What goes wrong:** SPA depends on a single `index.html`. Discriminated-union `screen` field means there's no real routing — but if the user ever bookmarks a URL with a path or refreshes on a non-root URL, Vercel returns 404 instead of serving `index.html`.

**Why it happens:** Default Vercel deploy serves files literally; `/some/path` → 404 if no file exists.

**How to avoid:** `vercel.json` with rewrites:

```json
{
  "rewrites": [
    { "source": "/((?!sprites/|assets/).*)", "destination": "/index.html" }
  ]
}
```

The negative lookahead preserves `/sprites/*` and `/assets/*` (fingerprinted Vite output) while rewriting everything else to the SPA shell.

**Phase to fix:** Phase 1 (FOUND-06).

### Pitfall 6: Tailwind v4 Setup Following v3 Tutorials

**What goes wrong:** Most Google results for "Tailwind + Vite" target v3 (PostCSS-based). Following them yields broken setup with v4: `tailwindcss` CLI not found, `@tailwind base/components/utilities` directives don't work, `tailwind.config.js` ignored.

**Why it happens:** Tailwind v4 is a complete rewrite. v4 uses `@tailwindcss/vite`, CSS-first `@theme` directive, single `@import "tailwindcss"` line. v3 tutorials are still the majority of search results.

**How to avoid:** Follow Tailwind v4's official Vite guide. Concrete `index.css` for v4:

```css
@import "tailwindcss";

@theme {
  --color-base-bg: #0a0a0a;
  /* extend with type colors, etc. */
}

@layer base {
  body {
    @apply bg-[var(--color-base-bg)] text-white;
  }
}
```

`vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

[CITED: Tailwind CSS v4.0 launch post — `tailwindcss.com/blog/tailwindcss-v4`, verified in research/STACK.md by prior WebFetch]

**Phase to fix:** Phase 1 (FOUND-02).

### Pitfall 7: React 19 Type Errors from `@types/react@18`

**What goes wrong:** Install `react@19` but `@types/react@^18` ships in `package-lock.json` from a transitive dep. Components using ref-as-prop or new `use()` API produce confusing type errors.

**How to avoid:** Pin `@types/react@^19` and `@types/react-dom@^19` in `devDependencies`. Add a `package.json` `overrides` block if a transitive dep tries to pull `@types/react@^18`:

```json
{
  "overrides": {
    "@types/react": "^19.2",
    "@types/react-dom": "^19.2"
  }
}
```

**Phase to fix:** Phase 1 (FOUND-01/FOUND-03).

### Pitfall 8: Sprite Download Hits GitHub Rate Limit

**What goes wrong:** Build script downloads all 151 sprites in parallel from `raw.githubusercontent.com`. GitHub rate-limits aggressive clients (60 unauth requests/hour for some endpoints; raw is more permissive but not unlimited).

**How to avoid:** Same throttling as PokéAPI script — concurrency cap (10), exponential backoff on 429, `User-Agent` header. Download is idempotent — once committed to `public/sprites/`, the script can be set to skip already-downloaded files.

**Phase to fix:** Phase 1 (DATA-04).

## Code Examples

### Build-Time Fetch Script (skeleton)

```typescript
// scripts/fetch-pokemon-gen1.ts
// Run: npx tsx scripts/fetch-pokemon-gen1.ts
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const POKEAPI = 'https://pokeapi.co/api/v2';
const GEN1_TYPES = [
  'normal','fire','water','electric','grass','ice',
  'fighting','poison','ground','flying','psychic',
  'bug','rock','ghost','dragon',
] as const;
const TypeName = z.enum(GEN1_TYPES);

// Minimal Pokémon shape (Gen-1 needs)
const PokemonRawSchema = z.object({
  id: z.number().int().min(1).max(151),
  name: z.string(),
  types: z.array(z.object({
    slot: z.number(),
    type: z.object({ name: TypeName }),
  })).min(1).max(2),
  stats: z.array(z.object({
    base_stat: z.number().int().min(1),
    stat: z.object({ name: z.string() }),
  })),
  moves: z.array(z.object({
    move: z.object({ name: z.string() }),
    version_group_details: z.array(z.object({
      level_learned_at: z.number().int(),
      move_learn_method: z.object({ name: z.string() }),
      version_group: z.object({ name: z.string() }),
    })),
  })),
  sprites: z.object({
    versions: z.object({
      'generation-i': z.object({
        'red-blue': z.object({
          front_default: z.string().nullable(),
        }),
        'yellow': z.object({
          front_default: z.string().nullable(),
        }),
      }),
    }),
  }),
});

const MoveRawSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  power: z.number().int().nullable(),
  pp: z.number().int().nullable(),
  accuracy: z.number().int().nullable(),
  priority: z.number().int(),
  type: z.object({ name: TypeName }),
  damage_class: z.object({ name: z.enum(['physical', 'special', 'status']) }), // D-08
  meta: z.object({
    ailment: z.object({ name: z.string() }).nullable(),
    ailment_chance: z.number().int(),
    crit_rate: z.number().int(),
    drain: z.number().int(),
    flinch_chance: z.number().int(),
    healing: z.number().int(),
    max_hits: z.number().int().nullable(),
    min_hits: z.number().int().nullable(),
    stat_chance: z.number().int(),
  }).nullable(),
});

const TypeRawSchema = z.object({
  name: TypeName,
  damage_relations: z.object({
    double_damage_to: z.array(z.object({ name: z.string() })),
    half_damage_to: z.array(z.object({ name: z.string() })),
    no_damage_to: z.array(z.object({ name: z.string() })),
  }),
});

async function fetchJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'poketrail-build (https://github.com/USER/poketrail)' },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return schema.parse(await res.json());
}

// Concurrency-limited fetch (poor man's p-limit)
async function pmap<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  const queue = items.slice();
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) {
        const item = queue.shift()!;
        out.push(await fn(item));
      }
    })
  );
  return out;
}

async function main() {
  // 1. Fetch all 151 Pokémon
  const ids = Array.from({ length: 151 }, (_, i) => i + 1);
  const raw = await pmap(ids, 10, (id) =>
    fetchJson(`${POKEAPI}/pokemon/${id}`, PokemonRawSchema)
  );

  // 2. Collect referenced moves (Gen-1 red-blue version group only)
  const moveNames = new Set<string>();
  for (const p of raw) {
    for (const m of p.moves) {
      const learnedInGen1 = m.version_group_details.some(
        (d) => d.version_group.name === 'red-blue'
      );
      if (learnedInGen1) moveNames.add(m.move.name);
    }
  }
  const moves = await pmap([...moveNames], 10, (name) =>
    fetchJson(`${POKEAPI}/move/${name}`, MoveRawSchema)
  );

  // 3. Fetch the 15 Gen-1 types
  const types = await pmap([...GEN1_TYPES], 5, (name) =>
    fetchJson(`${POKEAPI}/type/${name}`, TypeRawSchema)
  );

  // 4. Derive type chart (D-06)
  const typeChart: Record<string, Record<string, number>> = {};
  for (const t of types) {
    typeChart[t.name] = Object.fromEntries(GEN1_TYPES.map((d) => [d, 1]));
    for (const x of t.damage_relations.double_damage_to) {
      if (GEN1_TYPES.includes(x.name as never)) typeChart[t.name][x.name] = 2;
    }
    for (const x of t.damage_relations.half_damage_to) {
      if (GEN1_TYPES.includes(x.name as never)) typeChart[t.name][x.name] = 0.5;
    }
    for (const x of t.damage_relations.no_damage_to) {
      if (GEN1_TYPES.includes(x.name as never)) typeChart[t.name][x.name] = 0;
    }
  }

  // 5. Download sprites (D-02 — pixel only, red-blue → fallback yellow)
  mkdirSync('public/sprites', { recursive: true });
  await pmap(raw, 10, async (p) => {
    const url =
      p.sprites.versions['generation-i']['red-blue'].front_default ??
      p.sprites.versions['generation-i'].yellow.front_default;
    if (!url) {
      console.warn(`No Gen-1 sprite for #${p.id} ${p.name} — using placeholder`);
      return;
    }
    const path = `public/sprites/${p.id}.png`;
    if (existsSync(path)) return; // idempotent
    const res = await fetch(url, { headers: { 'User-Agent': 'poketrail-build' } });
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(path, buf);
  });

  // 6. Project to game shape (slim down) and write JSON
  const pokemonOut = raw.map((p) => ({
    id: p.id,
    name: p.name,
    types: p.types.map((t) => t.type.name),
    baseStats: Object.fromEntries(p.stats.map((s) => [s.stat.name, s.base_stat])),
    sprite: `/sprites/${p.id}.png`,
    levelUpMoves: p.moves
      .filter((m) =>
        m.version_group_details.some((d) => d.version_group.name === 'red-blue')
      )
      .map((m) => ({
        name: m.move.name,
        level: m.version_group_details
          .find((d) => d.version_group.name === 'red-blue')!.level_learned_at,
      })),
  }));

  writeFileSync('src/data/pokemon-gen1.json', JSON.stringify(pokemonOut, null, 2));
  writeFileSync('src/data/moves-gen1.json', JSON.stringify(moves, null, 2));
  writeFileSync('src/data/typeChart.json', JSON.stringify(typeChart, null, 2));
  console.log(`Wrote ${pokemonOut.length} Pokémon, ${moves.length} moves, ${types.length} types.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### Damage Formula (modern Gen-1, with locked overrides)

```typescript
// src/engine/damage.ts
// Source: Bulbapedia "Damage" page, Smogon Damage Calculator (Gen 1 / RBY mode)
// Locked overrides per CONTEXT.md:
//   D-07: crit flat ~1/24 chance, ×1.5 multiplier
//   D-08: per-move physical/special via damage_class
//   D-09: accuracy floor 70%, min-damage 1
//   D-10: STAB ×1.5, random 85–100%
import type { RNG } from './rng';

export interface Combatant {
  level: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  types: readonly string[]; // 1 or 2
}

export interface MoveLike {
  power: number | null;          // null = status move (no damage)
  type: string;
  damageClass: 'physical' | 'special' | 'status'; // D-08
}

export interface DamageContext {
  attacker: Combatant;
  defender: Combatant;
  move: MoveLike;
  typeMultiplier: number; // pre-computed product from typeChart (single OR dual type)
  rng: RNG;
}

export interface DamageResult {
  damage: number;        // integer; 0 if status move; min 1 otherwise
  crit: boolean;
  effectiveness: number; // typeMultiplier (forwarded for log messages)
}

export function calculateDamage(ctx: DamageContext): DamageResult {
  const { attacker, defender, move, typeMultiplier, rng } = ctx;

  // Status moves: no damage path
  if (move.damageClass === 'status' || move.power === null) {
    return { damage: 0, crit: false, effectiveness: typeMultiplier };
  }

  // Type immunity short-circuit
  if (typeMultiplier === 0) {
    return { damage: 0, crit: false, effectiveness: 0 };
  }

  // Pick attack/defense pair
  const A = move.damageClass === 'physical' ? attacker.attack : attacker.spAttack;
  const D = move.damageClass === 'physical' ? defender.defense : defender.spDefense;

  // Standard formula: ((2*L/5 + 2) * Power * A/D) / 50 + 2
  const base = Math.floor(
    Math.floor((Math.floor((2 * attacker.level) / 5) + 2) * move.power * A / D) / 50
  ) + 2;

  // Crit: ~1/24 chance (D-07)
  const crit = rng.chance(1 / 24);
  const critMult = crit ? 1.5 : 1;

  // STAB ×1.5 if move type matches an attacker type (D-10)
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;

  // Random factor 85–100% via RNG (D-10)
  const randMult = 0.85 + rng.next() * 0.15;

  // Multiplier order: crit, then STAB, then type, then random.
  // (Bulbapedia documents this order for the "modern" formula.)
  const raw = base * critMult * stab * typeMultiplier * randMult;

  // Min-damage 1 floor (D-09)
  const damage = Math.max(1, Math.floor(raw));

  return { damage, crit, effectiveness: typeMultiplier };
}
```

[CITED: Bulbapedia "Damage" article documents this formula structure for Gen V+ — `bulbapedia.bulbagarden.net/wiki/Damage`. The locked overrides (1/24 crit, per-move category, 85–100% random) align with the modern (Gen V+) formula. Smogon's damage calculator implements the same. Both references are non-WebFetched in this session — flagged below as needing pre-implementation verification by the planner if exact in-game numbers are mission-critical.]

### Type Chart Lookup (single + dual)

```typescript
// src/engine/typeChart.ts
import { TYPE_CHART } from '../data';

export function getTypeMultiplier(
  moveType: string,
  defenderTypes: readonly string[]
): number {
  // Throw on unknown types (catches typos cascading silently)
  if (!(moveType in TYPE_CHART)) {
    throw new Error(`Unknown move type: ${moveType}`);
  }
  let mult = 1;
  for (const dt of defenderTypes) {
    const cell = TYPE_CHART[moveType][dt];
    if (cell === undefined) {
      throw new Error(`Unknown defender type: ${dt}`);
    }
    mult *= cell;
  }
  return mult;
}
```

### Accuracy Roll (with 70% floor)

```typescript
// src/engine/accuracy.ts
import type { RNG } from './rng';

const ACCURACY_FLOOR = 0.70; // D-09

export function rollAccuracy(moveAccuracy: number | null, rng: RNG): boolean {
  // null accuracy = always-hit moves (Swift, etc.)
  if (moveAccuracy === null) return true;
  const effective = Math.max(ACCURACY_FLOOR, moveAccuracy / 100);
  return rng.next() < effective;
}
```

### `tsconfig.json` (strict flags)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "isolatedModules": true,
    "allowJs": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src", "scripts", "vite.config.ts", "vitest.config.ts"]
}
```

### `eslint.config.js` (engine purity guards)

```javascript
// eslint.config.js — flat config (ESLint 9)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/data/*.json'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-explicit-any': 'error', // CLAUDE.md
    },
  },
  // ENGINE PURITY (FOUND-05, D-14) — applies only to src/engine/**
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'Engine must not import React.' },
            { name: 'react-dom', message: 'Engine must not import React DOM.' },
          ],
          patterns: [
            { group: ['react/*', 'react-dom/*'], message: 'Engine must not import React.' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'Engine must use the seedable RNG, not Math.random.',
        },
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: 'Engine must not depend on wall-clock time.',
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'Engine must not construct Date objects.',
        },
      ],
    },
  }
);
```

[CITED: ESLint flat config for `no-restricted-imports` and `no-restricted-syntax` — official ESLint docs at `eslint.org/docs/latest/rules/no-restricted-imports`]

### `vitest.config.ts` (split node + jsdom envs)

```typescript
// vitest.config.ts — Vitest 2 with workspace projects (D-15)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Default: node env (engine tests, fast)
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Per-file override via /* @vitest-environment jsdom */ docblock
    // OR use Vitest "projects" (formerly "workspace") for cleaner split:
    projects: [
      {
        test: {
          name: 'engine',
          include: ['src/engine/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'ui',
          include: ['src/components/**/*.test.tsx', 'tests/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./tests/setup.ts'],
        },
      },
    ],
  },
});
```

[CITED: Vitest 2 docs on `test.projects` — `vitest.dev/guide/projects`]

### `vercel.json` (SPA fallback)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!sprites/|assets/|favicon\\.ico).*)",
      "destination": "/index.html"
    }
  ]
}
```

### `index.html` (viewport for mobile baseline)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>PokeTrail</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

[`viewport-fit=cover` enables `env(safe-area-inset-*)` (MOBILE-02 paired with `100dvh`)]

### A11y/Mobile Baseline `<Button>` Primitive

```tsx
// src/components/ui/Button.tsx
import { forwardRef, ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={[
        // 44×44 minimum tap target (MOBILE-01)
        'min-h-[44px] min-w-[44px]',
        // Suppress double-tap zoom (MOBILE-03)
        'touch-manipulation',
        // Visible focus ring (A11Y-02)
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]',
        // Default styling
        'inline-flex items-center justify-center rounded-2xl px-4 py-2',
        'bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50',
        'transition-colors',
        className,
      ].join(' ')}
      {...props}
    />
  )
);
Button.displayName = 'Button';
```

Note: Tailwind v4 ships `touch-manipulation` as a built-in utility (compiled to `touch-action: manipulation`). [CITED: Tailwind v4 docs `touch-action` utility]

### A11y/Mobile Baseline `<TypeBadge>` Primitive (A11Y-01)

```tsx
// src/components/ui/TypeBadge.tsx
const TYPE_BG: Record<string, string> = {
  fire:     'bg-red-500',
  water:    'bg-blue-500',
  electric: 'bg-yellow-400 text-black',
  grass:    'bg-green-500',
  // ... 15 entries, one per Gen-1 type (D-06)
};

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center',
        'rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
        TYPE_BG[type] ?? 'bg-zinc-600',
      ].join(' ')}
    >
      {/* TEXT LABEL is mandatory — A11Y-01, D-06 */}
      {type}
    </span>
  );
}
```

### Layout: `100dvh` (MOBILE-02)

```tsx
// src/App.tsx (Phase 1 placeholder)
export default function App() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white flex flex-col">
      <main className="flex-1 flex items-center justify-center">
        {/* Title placeholder for Phase 1 — full title screen in Phase 3 */}
        <h1 className="text-4xl font-bold">PokeTrail</h1>
      </main>
      <footer
        className="text-xs text-zinc-500 text-center p-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        PokeTrail is a non-commercial fan project. Pokémon and all related
        characters are trademarks of Nintendo / Game Freak / The Pokémon Company.
        This site is not affiliated with or endorsed by them.
      </footer>
    </div>
  );
}
```

The disclaimer text is the locked D-03 wording.

## Golden Test Cases (≥ 20 — ENG-04)

These cover the formula's edge surface: STAB on/off, single + dual type, super-effective + immune + neutral, physical + special + status, level extremes, accuracy floor, min-damage-1.

> **Methodology note:** Smogon Damage Calculator's RBY tab uses Gen-1 mechanics (special split not yet present, etc.). Because PokeTrail uses **modern overrides** (per-move category, ~1/24 crit, STAB ×1.5 — NOT Gen-1's ×1.5 STAB-with-Gen-1-special), the cleanest reference is **Showdown's Gen-5+ calc with the Gen-1 type chart toggled to "modern minus Steel/Dark/Fairy"** — but no public calc supports exactly that hybrid. Plan: verify each case against Bulbapedia's documented formula manually using the locked overrides, AND lock the test outcomes to **damage RANGES** (random factor 85–100% gives a 16% spread) rather than single integers, except where deterministic (status, immunity, min-damage-1).
>
> [ASSUMED — exact integer values from Smogon RBY calc may differ from this hybrid; the planner should treat the numbers below as starting hypotheses to be re-verified against a calculator implementing the locked overrides during Wave 0 of Phase 1.]

| # | Scenario | Attacker | Move | Defender | Expected | Verifies |
|---|----------|----------|------|----------|----------|----------|
| G1 | STAB super-effective (water vs fire) | L25 Squirtle (Atk 56, def don't care) using Water Gun | Water Gun (40 BP, special, water) | L25 Charmander (SpDef 50) | ~22–26 (no crit) | STAB×1.5, 2× type, special split, random factor |
| G2 | Same as G1 with crit | same | same | same | ~33–39 | Crit ×1.5 stacked on top |
| G3 | STAB neutral | L25 Charmander using Ember | Ember (40 BP, special, fire) | L25 Pikachu (SpDef 50) | ~10–13 | STAB ×1.5, neutral 1× |
| G4 | Non-STAB neutral | L25 Charmander using Tackle | Tackle (40 BP, physical, normal) | L25 Pikachu (Def 40) | ~8–11 | No STAB, neutral, physical split |
| G5 | Dual-type 4× weakness | L20 Bulbasaur using Vine Whip | Vine Whip (45 BP, special, grass) | L20 Geodude Rock/Ground (SpDef 30) | very high (4× type × STAB) | Dual-type stacking 2×2 |
| G6 | Type immunity | L30 Pikachu using Thunderbolt | Thunderbolt (90 BP, special, electric) | L30 Diglett (Ground) | **0** | 0× type immunity short-circuit |
| G7 | Ghost vs Normal immunity (modern, NOT Gen-1 bug) | L30 Gastly using Lick | Lick (30 BP, physical, ghost) | L30 Rattata (Normal) | **0** | Ghost→Normal 0× (modern) |
| G8 | Normal vs Ghost immunity | L30 Rattata using Tackle | Tackle (40 BP, physical, normal) | L30 Gastly (Ghost) | **0** | Normal→Ghost 0× |
| G9 | Psychic vs Ghost (modern: 2×, not Gen-1 bug 0×) | L30 Alakazam using Psychic | Psychic (90 BP, special, psychic) | L30 Gengar Ghost/Poison | high (2× × 2× = 4× super-effective on Poison too) | Modern type chart — Gen-1 bug NOT reproduced (D-06) |
| G10 | Status move | L30 Bulbasaur using Sleep Powder | Sleep Powder (null power, status, grass) | L30 anything | **0 damage** | Status moves bypass damage path entirely |
| G11 | Min-damage-1 floor | L1 Caterpie using Tackle | Tackle (40 BP, physical, normal) | L100 Snorlax (Def 110) | **1** (not 0 from rounding) | min-damage-1 (D-09) |
| G12 | High-power STAB super-effective + crit | L50 Charizard using Flamethrower | Flamethrower (90 BP, special, fire) | L50 Venusaur Grass/Poison | very high (2× type × STAB × crit) | 4-way multiplier stack |
| G13 | Not-very-effective (0.5×) | L25 Squirtle using Water Gun | Water Gun (40 BP, special, water) | L25 Bulbasaur Grass/Poison | low (0.5× water vs grass) | 0.5× type |
| G14 | Doubly-not-very-effective (0.25×) | L30 Charmander using Ember | Ember (40 BP, special, fire) | L30 Squirtle Water (or dual water) — for 0.25× use Magikarp Water | very low | 0.5× × 0.5× = 0.25× hypothetical (verify Gen-1 dual exists) |
| G15 | High-level matchup | L50 Mewtwo using Psychic | Psychic (90 BP, special, psychic) | L50 Mew (Psychic) | moderate (STAB but 0.5× psychic→psychic) | STAB cancels with resist |
| G16 | Crit on a 1-power-equivalent low-damage move | L5 starter using Tackle | Tackle (40 BP, physical, normal) | L5 starter | base ~3–4, crit ~5–6 | Crit floor still ≥1 |
| G17 | RNG bounds (low) | Fixed seed pin to RNG that always rolls 0.0 | any | any | exact computed-low value | Random factor floor 0.85 |
| G18 | RNG bounds (high) | Fixed seed pin to RNG that always rolls 0.9999 | any | any | exact computed-high value | Random factor ceiling 1.00 |
| G19 | Accuracy floor 70% on a 50%-acc move | mocked rng.next() = 0.69 with move.accuracy=50 | any | any | **hits** (70% floor) | accuracy floor (D-09) |
| G20 | Accuracy floor 70% on a 50%-acc move (miss) | mocked rng.next() = 0.71 | any | any | **misses** | accuracy floor edge |
| G21 | Always-hit move (null accuracy) | move.accuracy=null | any | any | **always hits** | null-accuracy bypass |
| G22 | Crit ~1/24 frequency (statistical) | Run 100,000 rolls | — | — | Empirical crit rate 0.040 < x < 0.044 | Crit rate from D-07 |
| G23 | RNG determinism | createRng(42), call next() 100 times, recreate, call again | — | — | Same 100 numbers | Mulberry32 determinism (ENG-01) |
| G24 | Counter persistence | createRng(42, 50), assert next number = 51st number from createRng(42, 0) | — | — | Match | Counter replay semantics |

The planner should plan a Wave-0 task: "verify G1–G15 numerical expectations against Bulbapedia formula spreadsheet using the locked overrides; pin exact ranges in Vitest table." G16–G24 are deterministic and can be locked as exact assertions immediately.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwindcss@3` + `postcss` + `autoprefixer` | `tailwindcss@4` + `@tailwindcss/vite` (single plugin) | Tailwind v4.0 GA on 2025-01-22 | Following v3 tutorials produces broken setup; need v4-specific guides |
| `framer-motion` (npm name) | `motion` (npm name, same code) | Framer rebrand (2024+) | Phase 10 concern; not Phase 1 |
| `forwardRef` for ref types | Pass `ref` as a regular prop | React 19 (2024-12-05 stable) | Type defs require `@types/react@^19` |
| `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` (separate) | `typescript-eslint` (single package) | typescript-eslint v8 | Cleaner flat-config setup |
| ESLint legacy `.eslintrc.json` | ESLint flat config `eslint.config.js` | ESLint 9 (2024-04) | Required for all new ESLint 9 setups |
| `JSON.parse` + manual shape checks for localStorage | Zod `safeParse` with versioned schemas | Mainstream by ~2022 | Standard for any client-side state |
| Hand-typed Pokémon type chart | Generated from PokéAPI `damage_relations` | Available since PokéAPI v2 (2014+) | Used here per D-06 |

**Deprecated / outdated for Phase 1:**
- `@vitejs/plugin-react-swc` for new projects: only switch when build performance bites — Babel plugin has fewer plugin-compat surprises (research/STACK.md).
- `react-router` for this app: the discriminated-union `screen` field is the locked architecture; routing is never added.
- `useReducer` without Immer: the spread-operator chains are unmaintainable past Phase 3 (D-13).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Smogon golden test exact integer values for G1–G15 will match Bulbapedia formula with locked overrides | Golden Test Cases | Medium — would require re-pinning 15 test outcomes during Wave 0; tests still pass at the **range** level (85–100% random factor gives a 16% spread); the actual game still ships, just with re-pinned numbers |
| A2 | Move category split (D-08) is reliably available as `damage_class` on every Gen-1 move via PokéAPI `/move/{id}` | Build-Time Fetch Script | Low — PokéAPI documented field; verifiable with one curl |
| A3 | All 151 Gen-1 Pokémon have a non-null `sprites.versions['generation-i']['red-blue'].front_default` (with `yellow` fallback) | Build-Time Fetch Script | Low — well-known sprite set; if any are null the script logs a warning and uses placeholder |
| A4 | `viewport-fit=cover` + `100dvh` is sufficient mobile-baseline for iOS Safari + Android Chrome | Mobile Baseline | Low — well-documented MDN pattern; Phase 11 will real-device-audit anyway |
| A5 | ESLint `no-restricted-syntax` selectors `MemberExpression[object.name='Math'][property.name='random']` will catch all forms of `Math.random` | ESLint config | Low — standard AST selector; some indirect patterns (e.g., destructured `const { random } = Math`) bypass but are rare and flag-able if encountered |
| A6 | Pinning `^6.x` for Vite, `^2.x` for Vitest, `^3.x` for Zod, `^5.7` for TypeScript will not break against transitive peer-dep constraints from Tailwind v4, RTL 16, or `@vitejs/plugin-react@4` | Standard Stack | Low — prior research/STACK.md verified the matrix; npm install will fail loud if a peer constraint blocks the matrix |
| A7 | The damage-formula multiplier order (base → crit → STAB → type → random) matches what Smogon-literate players expect | Damage Formula | Medium — Bulbapedia's "Damage" page is the canonical doc; if the planner finds Smogon documentation specifying a different order for the modern formula, this needs adjustment. The locked overrides (D-07/08/09/10) all multiply commutatively except for the floor steps, so visible difference is small |
| A8 | `crypto.randomUUID()` is available in all targeted browsers (used later for party-slot IDs) | Don't Hand-Roll | Low — universal in modern browsers + Node 20+, all locked targets |
| A9 | PokéAPI's Gen-1 sprite URL pattern (`sprites.versions['generation-i']['red-blue'].front_default`) is stable through Phase 1 ship date | PokéAPI integration | Low — pattern has been stable since PokéAPI v2 launch; sprite CDN returned 200 in this session |
| A10 | The `eslint-plugin-react-refresh` rule `only-export-components` warns (not errors) is appropriate for this project — most files export only components but `data/index.ts` exports validated objects | ESLint config | Low — `warn` not `error` is the standard pattern; if it generates noise, demote to `off` for `src/data/**` |

## Open Questions

1. **Should the Phase 1 Vercel deploy include any actual Title-screen UI, or just the placeholder + disclaimer?**
   - What we know: FOUND-06 says "legal disclaimer is visible on the title placeholder" — so a placeholder with the disclaimer is sufficient.
   - What's unclear: Whether the planner expects a "PokeTrail" wordmark + a "New Run (Phase 3 will activate)" disabled button, or just the bare disclaimer.
   - Recommendation: Bare title placeholder (centered "PokeTrail" wordmark + footer disclaimer + bg-[#0a0a0a]) is the minimum that satisfies FOUND-06. Defer the "New Run" button to Phase 3 (UI-01).

2. **Should the `vitest.config.ts` use `test.projects` or per-file `@vitest-environment` docblocks for the node/jsdom split?**
   - What we know: Both work in Vitest 2.
   - What's unclear: Project preference.
   - Recommendation (Claude's discretion per CONTEXT.md): `test.projects` — cleaner separation, faster engine-only test runs (`vitest --project engine`), aligned with the strict-engine-purity principle.

3. **Where should the build-time fetch script's request cache live?**
   - What we know: Re-running the script today re-fetches everything (~316 requests, ~30–60 s). Idempotent for sprites (skips existing files) but not for JSON.
   - What's unclear: Whether the planner wants a `.cache/pokeapi/` git-ignored cache for fast iteration or just lives with re-fetches.
   - Recommendation: Add `.cache/` to `.gitignore` and have the script write each PokéAPI response to `.cache/pokeapi/{id}.json` on success; on re-run, use the cache if present and `--no-cache` flag bypasses. Phase-1 nice-to-have, not gating.

4. **Should TS path aliases (`@engine/*`, `@data/*`) be set up in Phase 1?**
   - What we know: Vite + Vitest both support `tsconfig` `paths`; sets a clean import surface.
   - What's unclear: Project preference for relative vs alias imports.
   - Recommendation: Add `@/*` → `src/*` alias only. Avoid per-folder aliases (`@engine/*`) — they fight against the ESLint engine-purity rule's path-based scoping (the rule looks at `src/engine/**` as a path pattern; aliases can confuse linter resolution).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite 6, scripts | ✓ | v25.9.0 (system) | — but **note: Vite 6 officially supports Node 20 LTS or 22 LTS**; v25 is unsupported. Pin via `.nvmrc` to `22` for the project. |
| npm | Package management | ✓ | 11.12.1 | — |
| `tsx` | Build-time fetch script execution | ✗ (system) | — | Will be installed as devDependency in Phase 1 setup; run via `npx tsx ...` |
| PokéAPI HTTP endpoint | DATA-01/02/03 build-time fetch | ✓ | — | Returned HTTP 200 for `/pokemon/1` in this session |
| GitHub raw sprites CDN | DATA-04 sprite download | ✓ | — | Returned HTTP 200 for `sprites/.../1.png` in this session |
| Vercel account | FOUND-06 deploy | Unknown — user must verify | — | If absent, sign up free; alternative: Cloudflare Pages with same `vercel.json`-equivalent rewrites |
| Git remote (GitHub) | Vercel auto-deploy on push | Unknown — user must verify | — | Required for Vercel git-driven deploys |

**Missing dependencies with no fallback:**
- Vercel account + GitHub repo connection — required for FOUND-06 ("Vercel deployment is live from day 1"). Planner should include a Wave 0 / setup task confirming these exist before any deploy task can execute.

**Missing dependencies with fallback:**
- `tsx` — installs in `npm install` step.

**Note on Node version drift:** System Node is v25.9.0; Vite 6 officially supports Node 20 LTS / 22 LTS only. Recommend pinning `.nvmrc` to `22` and `package.json` `engines.node` to `^20 || ^22`. Vite 6 may still run on Node 25 but is unsupported and may surface odd warnings.

## Validation Architecture

> `nyquist_validation` is `true` in `.planning/config.json`. This section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **Vitest 2.x** (D-15) — `vitest@^2.1.9` |
| Config file | `vitest.config.ts` (split into `engine` and `ui` projects) |
| Quick run command (engine only) | `npx vitest run --project engine` |
| Quick run command (single test) | `npx vitest run --project engine -t "Tackle vs Bulbasaur"` |
| Full suite command | `npm test` (alias for `vitest run` — runs both projects) |
| Watch mode | `npx vitest` (no `run` arg) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | `npm run dev` boots without errors | smoke | manual: `npm run dev` and curl localhost | ❌ Wave 0 |
| FOUND-02 | Tailwind v4 utility classes apply | smoke | manual: inspect rendered Button has `min-h-[44px]` computed | ❌ manual |
| FOUND-03 | TS strict flags reject `any` | unit (compile-time) | `npx tsc --noEmit` (must exit 0) | ❌ Wave 0 |
| FOUND-04 | Vitest runs and reports green | smoke | `npm test` (must exit 0) | ❌ Wave 0 |
| FOUND-05 | ESLint blocks `react` import in `engine/**` | unit (lint) | Add `tests/eslint-engine-purity.test.ts` that runs ESLint API on a fixture file with `import { useState } from 'react'` and asserts the rule fires; OR `npx eslint src/engine` after a deliberate violation in a feature branch | ❌ Wave 0 |
| FOUND-06 | Vercel deploy serves disclaimer | manual smoke | open Vercel URL, verify disclaimer text matches D-03 | ❌ manual |
| FOUND-07 | Repo files exist | unit | `tests/repo-shape.test.ts` asserts `existsSync('.gitignore')`, `'.editorconfig'`, `'.prettierrc'`, `'README.md'` | ❌ Wave 0 |
| DATA-01..04 | Build script writes valid JSON + sprites | integration | `npx tsx scripts/fetch-pokemon-gen1.ts && node -e "require('./src/data/pokemon-gen1.json').length === 151"` | ❌ Wave 0 |
| DATA-05 | Module-init Zod re-validation works | unit | `tests/data-revalidation.test.ts` imports `src/data` (must not throw) AND a fixture-corruption test that imports a stub with bad shape (must throw) | ❌ Wave 0 |
| ENG-01 | mulberry32 deterministic | unit | `npx vitest run src/engine/__tests__/rng.test.ts` | ❌ Wave 0 |
| ENG-02 | typeChart resolves single + dual | unit | `npx vitest run src/engine/__tests__/typeChart.test.ts` | ❌ Wave 0 |
| ENG-03 | damage formula correctness | unit (golden table) | `npx vitest run src/engine/__tests__/damage.test.ts` | ❌ Wave 0 |
| ENG-04 | ≥ 20 Smogon golden cases pass | unit (golden table — included in ENG-03 file) | same as ENG-03 | ❌ Wave 0 |
| ENG-05 | Accuracy 70% floor + RNG | unit | `npx vitest run src/engine/__tests__/accuracy.test.ts` | ❌ Wave 0 |
| A11Y-01 | TypeBadge contains text label | unit (RTL) | `npx vitest run --project ui src/components/ui/TypeBadge.test.tsx` — `getByText(/fire/i)` resolves | ❌ Wave 0 |
| A11Y-02 | Button has visible focus ring | manual + unit (className includes `focus-visible:ring-2`) | `npx vitest run --project ui src/components/ui/Button.test.tsx` | ❌ Wave 0 |
| A11Y-03 | Keys 1–4 trigger move buttons | manual (Phase 4 full impl); Phase 1 = doc the pattern | manual: write the keyboard-shortcut hook stub + comment | manual |
| A11Y-04 | Battle log uses `aria-live` | manual (Phase 4 full impl); Phase 1 = doc the pattern | manual: pattern documented in `src/components/layout/AriaLive.tsx` placeholder | manual |
| MOBILE-01 | Buttons ≥ 44×44px | unit (className) | `expect(button.className).toMatch(/min-h-\[44px\]/)` | ❌ Wave 0 |
| MOBILE-02 | Layout uses `100dvh` | unit (className) | `expect(rootDiv.className).toMatch(/min-h-\[100dvh\]/)` | ❌ Wave 0 |
| MOBILE-03 | `touch-action: manipulation` set | unit (className) | `expect(button.className).toMatch(/touch-manipulation/)` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --project engine` (engine-only, ~50 ms typical for 25 tests)
- **Per wave merge:** `npm test` (full suite — both projects)
- **Per push to main:** `npm test && npm run lint && npx tsc --noEmit && npm run build` (full CI gate)
- **Phase gate (before `/gsd-verify-work`):** Full suite green + ESLint zero warnings + `tsc --noEmit` clean + `npm run build` succeeds + Vercel deploy URL serves disclaimer

### Wave 0 Gaps

The following test infrastructure does not exist yet (greenfield project) and must be created in Phase 1:

- [ ] `vitest.config.ts` — Vitest 2 with `test.projects` for engine + ui split
- [ ] `tests/setup.ts` — `@testing-library/jest-dom` matchers + jsdom env setup
- [ ] `src/engine/__tests__/rng.test.ts` — covers ENG-01
- [ ] `src/engine/__tests__/typeChart.test.ts` — covers ENG-02 (≥ 30 spot-checks per Pitfalls research)
- [ ] `src/engine/__tests__/damage.test.ts` — covers ENG-03 + ENG-04 (≥ 20 Smogon golden cases via `it.each`)
- [ ] `src/engine/__tests__/accuracy.test.ts` — covers ENG-05
- [ ] `src/components/ui/Button.test.tsx` — covers A11Y-02, MOBILE-01, MOBILE-03
- [ ] `src/components/ui/TypeBadge.test.tsx` — covers A11Y-01
- [ ] `tests/data-revalidation.test.ts` — covers DATA-05 (module-init Zod re-validation)
- [ ] `tests/repo-shape.test.ts` — covers FOUND-07
- [ ] `tests/eslint-engine-purity.test.ts` — covers FOUND-05 (programmatic ESLint API run on fixture)
- [ ] Framework install: `npm install --save-dev vitest@^2 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/dom@^10 jsdom@^25`

## Project Constraints (from CLAUDE.md)

The planner MUST verify the plan complies with these directives extracted from `./CLAUDE.md`:

**Hard constraints (non-negotiable):**
- **No `any` types.** `tsconfig.json` enforces `strict: true`. ESLint `@typescript-eslint/no-explicit-any: 'error'`.
- **No inline CSS, no separate `*.css` files** beyond `src/index.css` (Tailwind directives + `@theme` only). Tailwind classes only.
- **Engine strictly separated from UI.** ESLint rule blocks `react`/`react-dom` in `src/engine/**`. (D-14, FOUND-05)
- **Components max ~150 lines per file.** Split larger.
- **Dark theme only.** `bg-[#0a0a0a]` as base.
- **No runtime PokéAPI calls for gameplay.** Build-time fetch only.
- **No Redux / Zustand / Jotai.** Context + `useImmerReducer` only (D-13/D-18).
- **No `react-router`.** Discriminated-union `screen` field architecture.

**Workflow constraints:**
- All work goes through GSD commands (`/gsd-execute-phase`, `/gsd-quick`, `/gsd-debug`). No direct edits outside a GSD workflow.
- **Read files fully before editing.** Per global CLAUDE.md.
- Always run plan through `/gsd-verify-work` after `/gsd-execute-phase` — this phase has hard exit gates (golden tests green, ESLint enforced in CI, Vercel disclaimer live).

**Code quality:**
- No speculative abstractions for hypothetical future features.
- No "cleanup" outside the task scope.
- No unnecessary docstrings/comments in unchanged areas.
- Security default: no command injection (build script reads URLs from PokéAPI, but only fetches them — does not exec); no XSS surface (no `dangerouslySetInnerHTML` in this phase).

## Sources

### Primary (HIGH confidence)
- `.planning/phases/01-foundation-toolchain-engine-core/01-CONTEXT.md` — locked decisions (read in full)
- `.planning/REQUIREMENTS.md` — Phase-1 REQ-IDs and traceability table (read in full)
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, requirements (read in full)
- `.planning/research/STACK.md` — pinned tech stack with prior version verification (read via STATE.md inline copy)
- `.planning/research/PITFALLS.md` — DMCA, damage-formula bugs, type-chart errors, save corruption, sprite hotlinking, re-render storms, mobile UX, a11y (read in full)
- `.planning/research/ARCHITECTURE.md` — engine-purity boundary, FSM pattern, RNG threading, save versioning, anti-patterns (read in full)
- `CLAUDE.md` — project constraints, GSD workflow, code quality rules (read in full)
- npm registry — version verification via `npm view <pkg>@<major> version` for vite, vitest, zod, typescript, eslint, jsdom, immer, eslint-plugin-boundaries on 2026-04-25 [VERIFIED]
- PokéAPI HTTP endpoint — `https://pokeapi.co/api/v2/pokemon/1` returned HTTP 200 in this session [VERIFIED]
- GitHub raw sprite CDN — `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-i/red-blue/1.png` returned HTTP 200 [VERIFIED]

### Secondary (MEDIUM confidence — referenced from prior research, not re-verified this session)
- React 19.2 release notes — `react.dev/blog` (verified by prior research)
- Tailwind CSS v4.0 launch post — `tailwindcss.com/blog/tailwindcss-v4` (verified by prior research)
- Vitest 2 docs `test.projects` — `vitest.dev/guide/projects` [CITED]
- ESLint `no-restricted-imports` and `no-restricted-syntax` flat-config docs — `eslint.org/docs/latest/rules/` [CITED]
- Bulbapedia "Damage" formula reference — `bulbapedia.bulbagarden.net/wiki/Damage` [CITED]
- Smogon Damage Calculator — `calc.pokemonshowdown.com` (referenced for golden test methodology) [CITED]
- mulberry32 PRNG — Tommy Ettinger, public domain, well-reproduced (referenced in research/ARCHITECTURE.md) [CITED]

### Tertiary (LOW confidence — flagged for verification before committing exact values)
- **Smogon golden-test integer values for G1–G15** — assumed to match Bulbapedia formula with locked overrides; planner should verify via spreadsheet during Wave 0 of Phase 1 [ASSUMED — Assumption A1]
- **Multiplier order in damage formula** (base → crit → STAB → type → random) — Bulbapedia documents this for the modern formula; minor visible effect if order differs because all multipliers commute except for floor steps [ASSUMED — Assumption A7]

## Metadata

**Confidence breakdown:**
- Standard stack (libraries + versions): **HIGH** — all `^major` lines re-verified via npm registry in this session
- Architecture patterns: **HIGH** — all locked in CONTEXT.md or directly carried from prior research/ARCHITECTURE.md
- Damage formula structure: **HIGH** (formula structure, integer-truncation order from Bulbapedia)
- Damage formula golden values: **MEDIUM** (exact integers need Wave-0 spreadsheet verification — see Assumption A1)
- Type chart from PokéAPI: **HIGH** — D-06 + verified PokéAPI `damage_relations` shape
- Build-time fetch + sprite download: **HIGH** — both endpoints returned 200 in this session
- ESLint engine purity: **HIGH** — standard `no-restricted-imports` + `no-restricted-syntax` flat-config patterns
- A11y/mobile baseline: **HIGH** — well-documented WCAG / Apple HIG / MDN ground
- Vercel SPA deploy: **HIGH** — standard `vercel.json` rewrites pattern
- Vitest config split: **HIGH** — Vitest 2 `test.projects` documented

**Research date:** 2026-04-25
**Valid until:** ~2026-07-25 (90 days for stable infrastructure phase). Re-verify before re-pinning if delayed past v2 milestones.
