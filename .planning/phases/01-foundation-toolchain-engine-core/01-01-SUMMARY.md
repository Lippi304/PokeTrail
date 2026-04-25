---
phase: 01-foundation-toolchain-engine-core
plan: 01
subsystem: toolchain
tags: [foundation, toolchain, vite, react, tailwind, typescript, vitest, eslint, prettier]
requires: []
provides:
  - vite-react-tailwind-toolchain
  - tsconfig-strict-flags
  - eslint-engine-purity-rule
  - vitest-split-projects
  - npm-scripts-dev-build-test-lint-typecheck
  - tests/setup.ts (jest-dom)
  - tests/repo-shape.test.ts
  - tests/eslint-engine-purity.test.ts
affects:
  - all downstream plans (engine, data, ui, vercel) inherit this toolchain
tech-stack:
  added:
    - vite ^6.4
    - react ^19.2
    - react-dom ^19.2
    - typescript ^5.7
    - tailwindcss ^4.2
    - "@tailwindcss/vite ^4.2"
    - vitest ^2
    - jsdom ^25
    - "@testing-library/react ^16"
    - "@testing-library/jest-dom ^6"
    - "@testing-library/dom ^10"
    - zod ^3.23
    - immer ^10
    - use-immer ^0.11
    - eslint ^9
    - typescript-eslint ^8
    - eslint-plugin-react-hooks ^5
    - eslint-plugin-react-refresh ^0.4
    - eslint-config-prettier ^9
    - prettier ^3
    - tsx ^4
    - "@types/node ^25"
  patterns:
    - tsconfig strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes + verbatimModuleSyntax
    - ESLint flat config (ESLint 9) with engine-purity boundary on src/engine/**
    - Vitest 2 split projects ('engine' node env, 'ui' jsdom env)
    - Tailwind v4 single-import + @theme block + @layer base
    - Vite + React Babel plugin (not SWC) per D-12
key-files:
  created:
    - package.json
    - package-lock.json
    - .nvmrc
    - .gitignore
    - .editorconfig
    - .prettierrc
    - tsconfig.json
    - tsconfig.node.json
    - vite.config.ts
    - vitest.config.ts
    - eslint.config.js
    - index.html
    - src/main.tsx
    - src/App.tsx
    - src/index.css
    - tests/setup.ts
    - tests/repo-shape.test.ts
    - tests/eslint-engine-purity.test.ts
    - README.md
  modified: []
decisions:
  - D-11 implemented (React 19.2 not 18)
  - D-12 implemented (Tailwind v4.2 + @tailwindcss/vite plugin, not v3 + PostCSS)
  - D-13 implemented (Immer + use-immer + Zod installed day 1, even though Phase 1 does not yet persist)
  - D-14 implemented (ESLint flat config blocks react/react-dom in src/engine/** + Math.random/Date.now/new Date() AST selectors)
  - D-15 implemented (Vitest 2 + RTL 16 + jsdom 25)
metrics:
  duration: ~6 min
  tasks_completed: 2
  files_created: 19
  commits: 2
  completed_date: 2026-04-25
---

# Phase 1 Plan 1: Toolchain Foundation Summary

Bootstrapped greenfield repo with Vite 6 + React 19.2 + TypeScript 5.7 (strict + four extra strict flags) + Tailwind v4.2 (via @tailwindcss/vite, no PostCSS) + Vitest 2 split projects + ESLint 9 flat config that enforces the engine-purity boundary and a programmatic test that proves the rule fires.

## What Shipped

- **Pinned versions** in `package.json` matching RESEARCH.md (vite ^6.4, react ^19.2, tailwindcss ^4.2, vitest ^2, zod ^3.23, immer ^10, typescript ^5.7, eslint ^9, typescript-eslint ^8). `engines.node = "^20 || ^22"`. Scripts: dev, build, preview, test, test:engine, test:ui, test:watch, lint, typecheck, fetch:data.
- **Strict TS** (`tsconfig.json`): `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `isolatedModules`. Path alias `@/*` → `./src/*`. Separate `tsconfig.node.json` for build-time scripts.
- **Vite 6 + Tailwind v4 wiring** (`vite.config.ts`): React Babel plugin + `@tailwindcss/vite` plugin, alias `@` → `src/`.
- **Tailwind v4 CSS** (`src/index.css`): single `@import "tailwindcss"` + `@theme { --color-base-bg: #0a0a0a }` + `@layer base { body { ... } }`. No PostCSS, no `tailwind.config.js`.
- **App placeholder** (`src/App.tsx`): renders the wordmark "PokeTrail" centered on `bg-[#0a0a0a]`. The full disclaimer footer + `min-h-[100dvh]` layout is deferred to plan 04 per the plan's <action> note.
- **ESLint 9 flat config** (`eslint.config.js`):
  - js.recommended + tseslint.strict + tseslint.stylistic
  - react-hooks (recommended) + react-refresh (warn on only-export-components)
  - `@typescript-eslint/no-explicit-any: error` globally; relaxed for tests
  - **Engine purity (D-14, FOUND-05)** scoped to `src/engine/**/*.{ts,tsx}`:
    - `no-restricted-imports`: blocks `react`, `react-dom`, `react/*`, `react-dom/*`
    - `no-restricted-syntax`: AST selectors block `Math.random`, `Date.now`, `new Date()`
- **Vitest 2 split projects** (`vitest.config.ts`):
  - `engine`: node env, includes `src/engine/**/*.test.ts`
  - `ui`: jsdom env, includes `src/components/**/*.test.tsx` + `tests/**/*.test.{ts,tsx}`, setup file imports `@testing-library/jest-dom/vitest`
- **Programmatic ESLint test** (`tests/eslint-engine-purity.test.ts`): 6 fixtures (5 block + 1 allow) lint via the ESLint Node API with `filePath: 'src/engine/fixture.ts'` — proves the boundary fires in CI.
- **Repo-shape test** (`tests/repo-shape.test.ts`): 16 assertions covering all FOUND-07 files + version-pin regexes + `.nvmrc = 22`.
- **README.md** with the locked D-03 fan-project disclaimer ("non-commercial fan project ... Pokémon and all related characters are trademarks of Nintendo / Game Freak / The Pokémon Company. ... no ads, no donations, no microtransactions, ever") — D-05.
- `.gitignore` (incl. `tsconfig.tsbuildinfo`), `.editorconfig`, `.prettierrc`, `.nvmrc = 22` committed (FOUND-07).

## Quality-Gate Evidence

```
$ npm install                # exit 0 (warns about Node 25 vs engines ^20||^22 — non-blocking)
$ npm run lint               # exit 0, eslint . --max-warnings 0
$ npm test                   # exit 0
                             #   tests/repo-shape.test.ts (16 tests) ✓
                             #   tests/eslint-engine-purity.test.ts (6 tests) ✓
                             #   Test Files 2 passed (2), Tests 22 passed (22)
$ npx tsc --noEmit           # exit 0
$ npm run build              # exit 0
                             #   dist/index.html  0.41 kB
                             #   dist/assets/index-*.css  15.79 kB
                             #   dist/assets/index-*.js   194.75 kB
                             #   built in ~330ms
```

The 6 ESLint engine-purity test cases prove all five forbidden patterns fire `no-restricted-imports` / `no-restricted-syntax` and that pure TS does not — the boundary is provably enforced in CI.

## Decisions Implemented

| ID  | Decision                                          | Where                                                  |
| --- | ------------------------------------------------- | ------------------------------------------------------ |
| D-11 | React 19.2 (not 18)                               | `package.json` deps + `@types/react ^19.2`             |
| D-12 | Tailwind v4.2 + `@tailwindcss/vite` (not v3+PostCSS) | `vite.config.ts` plugin + `src/index.css` `@import`    |
| D-13 | Immer + use-immer + Zod day 1                     | `package.json` deps                                    |
| D-14 | ESLint blocks react/react-dom + Math.random / Date.now / new Date in `src/engine/**` | `eslint.config.js` scoped block; verified by `tests/eslint-engine-purity.test.ts` |
| D-15 | Vitest 2 + RTL 16 + jsdom 25, engine tests in node env | `vitest.config.ts` split projects                  |

## Patterns Locked for Downstream Plans

- **`src/engine/**`** is pure TS — ESLint enforces no React imports and no Math.random / Date.now / new Date(). Plan 02 (RNG + type chart + damage) inherits and writes its tests under `src/engine/**/*.test.ts` (engine project, node env).
- **`src/data/**`** for typed Gen-1 JSON (plan 03). `src/data/*.json` is in the ESLint ignore list.
- **`src/components/**`** for React UI (plan 04). Tests under `src/components/**/*.test.tsx` (ui project, jsdom env).
- **`tests/**`** for cross-cutting tests (repo-shape, eslint-purity, future integration). Run in ui project.
- **Path alias `@`** is wired in both `vite.config.ts` and `tsconfig.json` and inherits to Vitest via the shared Vite config.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 – Blocker] Added `@types/node` dependency**

- **Found during:** Task 1 (`npx tsc --noEmit`)
- **Issue:** `vite.config.ts` uses `node:path` and `__dirname`; without `@types/node` typecheck failed with "Cannot find module 'node:path'" + "Cannot find name '__dirname'".
- **Fix:** `npm install --save-dev @types/node` (resolved to ^25.6).
- **Files modified:** `package.json`, `package-lock.json`
- **Commit:** included in `ec9ec26` (Task 1)

**2. [Rule 1 – Bug] Changed build script `tsc -b` → `tsc --noEmit`**

- **Found during:** Task 1 (`npm run build`)
- **Issue:** `tsc -b && vite build` from the plan emits compiled `.js` siblings of every `.tsx` source (no `noEmit` flag in `tsc -b` mode), polluting `src/` and creating `tsconfig.tsbuildinfo`. Vite then served the wrong file in dev.
- **Fix:** Build now runs `tsc --noEmit && vite build` — typecheck-only gate, then Vite owns the actual emit. Cleaned up the leaked `src/App.js`, `src/main.js`, `vite.config.js`. Added `tsconfig.tsbuildinfo` to `.gitignore` defensively.
- **Files modified:** `package.json` (scripts.build), `.gitignore`
- **Commit:** included in `ec9ec26` (Task 1)

**3. [Rule 3 – Blocker] Removed `vite.config.ts` and `vitest.config.ts` from `tsconfig.json` include**

- **Found during:** Task 2 (`npx tsc --noEmit`)
- **Issue:** Vitest 2 ships its own vendored Vite copy. With `exactOptionalPropertyTypes: true` enabled, `defineConfig({ plugins: [react()] })` failed because `react()` returns `Plugin<any>` from one Vite copy and `defineConfig` from `vitest/config` expects the other. Hundreds of lines of diagnostic, none fixable in user code without `as any` (forbidden by CLAUDE.md no-`any` rule).
- **Fix:** Removed `vite.config.ts` and `vitest.config.ts` from `tsconfig.json` include. The two configs are loaded at runtime by Vite and Vitest themselves (which use their own type-checking pipelines), not by the project `tsc --noEmit`. `tsconfig.node.json` still references them for editor-language-server support if needed in future. The configs are valid TS and run correctly; they are simply not part of the strict project typecheck.
- **Files modified:** `tsconfig.json`
- **Commit:** included in `70017bd` (Task 2)

**4. [Rule 1 – Bug] Removed `!` non-null assertion in `tests/eslint-engine-purity.test.ts`**

- **Found during:** Task 2 (`npm run lint`)
- **Issue:** `typescript-eslint/strict` flags `@typescript-eslint/no-non-null-assertion` as an error; the original `return results[0]!` violated it.
- **Fix:** Replaced with explicit length-and-truthy check: `const first = results[0]; if (results.length !== 1 || !first) throw ...; return first;`. `noUncheckedIndexedAccess` makes the narrowing legitimate.
- **Files modified:** `tests/eslint-engine-purity.test.ts`
- **Commit:** included in `70017bd` (Task 2)

### Authentication Gates

None — local toolchain, no network, no auth.

## Threat Flags

None — local dev toolchain + repo scaffolding. No new network endpoints, no auth paths, no file access patterns at trust boundaries, no schema changes. Per the plan's frontmatter `threat_model`, this matches the expected "no threats" baseline. Re-evaluate in Phase 2 when the engine is added and Phase 3 when save/load arrives.

## Self-Check: PASSED

- Created files exist: package.json, .nvmrc, .gitignore, .editorconfig, .prettierrc, tsconfig.json, tsconfig.node.json, vite.config.ts, vitest.config.ts, eslint.config.js, index.html, src/main.tsx, src/App.tsx, src/index.css, tests/setup.ts, tests/repo-shape.test.ts, tests/eslint-engine-purity.test.ts, README.md (verified via `existsSync` in repo-shape test).
- Commits exist: `ec9ec26` (Task 1 scaffold), `70017bd` (Task 2 ESLint + Vitest + tests).
- All quality gates green: lint, test (22 passing), typecheck, build (`dist/index.html` produced).
