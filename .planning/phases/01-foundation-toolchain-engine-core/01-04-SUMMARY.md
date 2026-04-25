---
phase: 01-foundation-toolchain-engine-core
plan: 04
subsystem: ui
tags: [ui, a11y, mobile, primitives, dark-theme, tailwind, rtl, title-shell]
requires:
  - vite-react-tailwind-toolchain (from 01-01)
  - vitest-split-projects (from 01-01) — re-wired via workspace file
provides:
  - src/components/ui/Button.tsx (primitive — A11Y-02 + MOBILE-01 + MOBILE-03)
  - src/components/ui/TypeBadge.tsx (15 Gen-1 type colors + TEXT label per A11Y-01)
  - src/components/layout/Disclaimer.tsx (locked D-03 text)
  - src/components/layout/AriaLive.tsx (Phase 4 stub for A11Y-04)
  - src/hooks/useMoveHotkeys.ts (Phase 4 stub for A11Y-03)
  - src/App.tsx (Phase 1 title shell — min-h-[100dvh] + safe-area inset)
  - 27 new RTL assertions (Button 6, TypeBadge 16, App 5)
  - vitest.workspace.ts (Vitest 2 multi-environment routing)
affects:
  - downstream Phase 3 (UI-01 Title Screen) replaces App.tsx <h1> with full Title Screen
  - downstream Phase 4 (BattleScreen) consumes useMoveHotkeys + AriaLive (currently stubs)
  - all UI screens (Phase 3+) inherit a11y/mobile baseline from these primitives
tech-stack:
  added: []
  patterns:
    - React 19 forwardRef typing for Button (`forwardRef<HTMLButtonElement, ButtonProps>`)
    - "Color + always-text" pattern for TypeBadge — a11y-first, color-blind-safe
    - Stub-with-explicit-TODO for behaviors deferred to later phases (AriaLive, useMoveHotkeys)
    - `pb-[max(1rem,env(safe-area-inset-bottom))]` Tailwind v4 arbitrary value with env()
    - Vitest 2 workspace file (vitest.workspace.ts) for multi-environment projects
    - RTL 16 explicit `afterEach(cleanup)` in tests/setup.ts (Vitest 2 doesn't auto-cleanup)
key-files:
  created:
    - src/components/ui/Button.tsx
    - src/components/ui/TypeBadge.tsx
    - src/components/layout/Disclaimer.tsx
    - src/components/layout/AriaLive.tsx
    - src/hooks/useMoveHotkeys.ts
    - src/components/ui/Button.test.tsx
    - src/components/ui/TypeBadge.test.tsx
    - tests/app.test.tsx
    - vitest.workspace.ts
  modified:
    - src/App.tsx (full title shell — replaced placeholder)
    - tests/setup.ts (added afterEach cleanup wiring)
    - vitest.config.ts (projects moved to workspace file)
key-decisions:
  - A11Y-01 implemented (TypeBadge always renders the type's TEXT label, not just color)
  - A11Y-02 implemented (Button has focus-visible:ring-2 + offset for visible keyboard focus)
  - A11Y-03 pattern documented (useMoveHotkeys stub with TODO referencing Phase 4 / BATT-02)
  - A11Y-04 pattern documented (AriaLive component with role=log + aria-live=polite, TODO referencing Phase 4 / BATT-04)
  - MOBILE-01 implemented (Button enforces 44×44 minimum tap target via min-h-[44px] + min-w-[44px])
  - MOBILE-02 implemented (App root uses min-h-[100dvh]; footer pads with safe-area-inset-bottom)
  - MOBILE-03 implemented (Button has touch-manipulation class to suppress double-tap zoom)
  - FOUND-06 implemented (locked D-03 disclaimer text rendered in <App> footer, verified to survive production build)
requirements:
  - A11Y-01
  - A11Y-02
  - A11Y-03
  - A11Y-04
  - MOBILE-01
  - MOBILE-02
  - MOBILE-03
metrics:
  duration: ~10 min
  tasks_completed: 2
  files_created: 9
  files_modified: 3
  commits: 2
  completed_date: 2026-04-25
---

# Phase 1 Plan 4: UI Primitives + Title Shell Summary

A11y/mobile baseline UI primitives (Button, TypeBadge, Disclaimer, AriaLive stub, useMoveHotkeys stub) and the Phase 1 title shell — all WCAG-compliant focus rings, 44×44 tap targets, `touch-action: manipulation`, and `min-h-[100dvh]` baked in at the primitive level so Phase 3+ inherits the right behavior without per-screen rework. Locked D-03 disclaimer text renders verbatim in the title-screen footer with safe-area-inset-bottom padding.

## What Shipped

- **`src/components/ui/Button.tsx` (32 lines)** — React 19 `forwardRef<HTMLButtonElement, ButtonProps>` primitive. ClassName composition locks `min-h-[44px] min-w-[44px]` (MOBILE-01), `touch-manipulation` (MOBILE-03), `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]` (A11Y-02). Apple-inspired defaults: `rounded-2xl`, `bg-zinc-800 hover:bg-zinc-700`. Default `type="button"` to prevent accidental form submission. Accepts and forwards extra `className` without dropping baseline classes.
- **`src/components/ui/TypeBadge.tsx` (40 lines)** — `TYPE_BG: Record<string, string>` covers exactly the 15 Gen-1 types per D-06 (no `steel`, `dark`, `fairy`). Always renders the `{type}` string as TEXT content (A11Y-01) so color-blind users get the type information regardless of palette. Falls back to neutral `bg-zinc-600` for unknown types but still renders the text.
- **`src/components/layout/Disclaimer.tsx` (12 lines)** — Locked D-03 verbatim:  *"PokeTrail is a non-commercial fan project. Pokémon and all related characters are trademarks of Nintendo / Game Freak / The Pokémon Company. This site is not affiliated with or endorsed by them."*
- **`src/components/layout/AriaLive.tsx` (15 lines)** — Phase 1 stub. Renders `<div role="log" aria-live="polite" aria-atomic="false">{children}</div>`. Explicit TODO comment points to Phase 4 / BATT-04 where the rolling 8-message battle log is wired in.
- **`src/hooks/useMoveHotkeys.ts` (26 lines)** — Phase 1 stub. API surface = `useMoveHotkeys(handlers: readonly (() => void)[])`. `useEffect` body is a no-op except `void handlers` to keep ESLint happy. Doc comment specifies the Phase 4 contract: map `event.key '1'..'4'` → `handlers[0..3]`, skip when modifier is held, skip when input/textarea is focused.
- **`src/App.tsx` (18 lines)** — Phase 1 title placeholder shell. Root: `min-h-[100dvh] bg-[#0a0a0a] text-white flex flex-col` (MOBILE-02). Main: centered `<h1>PokeTrail</h1>` (Phase 3 / UI-01 replaces). Footer: `text-center px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]` with `<Disclaimer />`. The Tailwind v4 arbitrary-value class with `env(safe-area-inset-bottom)` parses cleanly — no PostCSS escape hatch needed.
- **27 new RTL assertions** across three test files:
  - `src/components/ui/Button.test.tsx` (6 assertions): className contains `min-h-[44px]`+`min-w-[44px]`, `touch-manipulation`, `focus-visible:ring-2`; children render; extra className composes; default `type="button"`.
  - `src/components/ui/TypeBadge.test.tsx` (16 assertions): `it.each` over all 15 Gen-1 types asserts text label rendered + 1 fallback case for unknown types.
  - `tests/app.test.tsx` (5 assertions): root has `min-h-[100dvh]`, root has `bg-[#0a0a0a]`, D-03 disclaimer text matches verbatim ("non-commercial fan project" + "Nintendo" + "Game Freak" + "The Pokémon Company"), `<h1>` PokeTrail wordmark renders, `<footer>` has `safe-area-inset-bottom`.

## Quality-Gate Evidence

```
$ npm test                     # exit 0 — 118/118 passing across 10 test files (~900 ms)
                                #   |ui| tests/app.test.tsx (5)
                                #   |ui| tests/data-revalidation.test.ts (10)
                                #   |ui| tests/repo-shape.test.ts (16)
                                #   |ui| tests/eslint-engine-purity.test.ts (6)
                                #   |ui| src/components/ui/Button.test.tsx (6)
                                #   |ui| src/components/ui/TypeBadge.test.tsx (16)
                                #   |engine| src/engine/__tests__/* (59)
$ npm run lint                  # exit 0 — eslint . --max-warnings 0
$ npx tsc --noEmit              # exit 0
$ npm run build                 # exit 0 — dist/index.html + 195 KB JS + 16 KB CSS, ~360 ms
$ grep -rq "non-commercial fan project" dist
                                # exit 0 — D-03 disclaimer survives production build (FOUND-06)
```

## A11y / Mobile Properties Locked Per File

| File | Property | Tailwind class / attribute | Requirement | Test |
|---|---|---|---|---|
| Button.tsx:13–14 | 44×44 tap target | `min-h-[44px] min-w-[44px]` | MOBILE-01 | Button.test.tsx:6–11 |
| Button.tsx:15–16 | suppress double-tap zoom | `touch-manipulation` | MOBILE-03 | Button.test.tsx:13–17 |
| Button.tsx:17–18 | visible keyboard focus | `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]` | A11Y-02 | Button.test.tsx:19–23 |
| TypeBadge.tsx:32 | TEXT label for color-blind users | `{type}` rendered as content | A11Y-01 | TypeBadge.test.tsx:6–25 (15 types) |
| App.tsx:9 | mobile-safe viewport height | `min-h-[100dvh]` | MOBILE-02 | tests/app.test.tsx:7–11 |
| App.tsx:13 | safe-area inset on footer | `pb-[max(1rem,env(safe-area-inset-bottom))]` | MOBILE-02 | tests/app.test.tsx:32–36 |
| AriaLive.tsx:11 | live region for screen readers | `role="log" aria-live="polite" aria-atomic="false"` | A11Y-04 (pattern documented) | — |
| useMoveHotkeys.ts | hotkey API surface | `useMoveHotkeys(handlers)` exported | A11Y-03 (pattern documented) | — |

## Decisions Implemented

| ID | Decision | Where |
|---|---|---|
| A11Y-01 | Type badges always render TEXT label | `TypeBadge.tsx:32` — `{type}` rendered inside the colored span; verified by 16 RTL assertions |
| A11Y-02 | Visible focus ring on keyboard navigation | `Button.tsx:17–18` — `focus-visible:ring-2 + ring-offset-2 + ring-offset-[#0a0a0a]`; verified by RTL test |
| A11Y-03 | Number-key 1–4 hotkey pattern | `useMoveHotkeys.ts` — Phase 1 stub with API + explicit Phase 4 TODO |
| A11Y-04 | Battle log uses aria-live for SR announcement | `AriaLive.tsx` — Phase 1 stub with `role=log` + `aria-live=polite` + Phase 4 TODO |
| MOBILE-01 | 44×44 minimum tap target on every button | `Button.tsx:13–14` — `min-h-[44px] min-w-[44px]`; verified by RTL test |
| MOBILE-02 | `100dvh` (NOT `100vh`) + safe-area inset | `App.tsx:9,13` — `min-h-[100dvh]` on root + `pb-[max(1rem,env(safe-area-inset-bottom))]` on footer; both verified by RTL test |
| MOBILE-03 | `touch-action: manipulation` on tap targets | `Button.tsx:15–16` — `touch-manipulation` Tailwind utility; verified by RTL test |
| FOUND-06 | Locked D-03 disclaimer in title-screen footer | `Disclaimer.tsx` text; mounted in `App.tsx:14`; verified by RTL test asserting all 4 phrases (non-commercial fan project, Nintendo, Game Freak, The Pokémon Company) AND by `grep` proving the string survives the production bundle |

## Patterns Locked for Downstream Plans

- **A11y/mobile-by-default primitives:** Phase 3 (Title/Starter/Settings), Phase 4 (Battle UI), Phase 5 (Route Map), Phase 6 (Bag/Reward) all consume `<Button>` directly — no per-screen `focus-visible` / tap-target rework. Per Pitfalls research: WCAG retrofit is "expensive"; locking in primitives is the cheap option.
- **TypeBadge color + text:** Future battle UI (HP bars, move buttons) and team UI (team summary, Pokédex) re-use `<TypeBadge>` for type rendering. The TEXT label is non-negotiable per A11Y-01.
- **Phase-1-stub pattern:** When a behavior belongs to a later phase but its API surface or pattern needs to be locked NOW (so consumers can plan against it), ship a stub with an explicit TODO citing the phase and requirement (BATT-02 / BATT-04). Established by `useMoveHotkeys.ts` and `AriaLive.tsx`.
- **`pb-[max(1rem,env(safe-area-inset-bottom))]`:** Confirmed Tailwind v4 parses arbitrary values containing `env()` and commas. Reusable for all "safe-area"-aware footers/headers in later UIs without dropping to `<style>` tags.
- **Vitest 2 workspace pattern:** Multi-environment projects live in `vitest.workspace.ts` (NOT in `vitest.config.ts.test.projects`). The `projects` array inside `defineConfig({ test: { projects: [...] } })` did NOT route file-includes to their declared environment — likely the same Vitest 2 multi-project bug Plan-02 SUMMARY documented. The workspace file works.
- **RTL 16 + Vitest 2 cleanup wiring:** `tests/setup.ts` MUST `import { afterEach } from 'vitest'; import { cleanup } from '@testing-library/react'; afterEach(cleanup);` — RTL 16 dropped the auto-cleanup hook for non-Jest runners. Without this, `getByRole` finds nodes from earlier renders.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocker] ESLint `consistent-type-definitions` on TypeBadgeProps + `array-type` on useMoveHotkeys handlers**

- **Found during:** Task 1 (`npm run lint`)
- **Issue:** The `tseslint.configs.stylistic` preset (active globally per Plan-01 ESLint config) enforces `interface` over `type` for object-shape props and `readonly T[]` over `ReadonlyArray<T>`. The plan's pseudocode used both forbidden forms.
- **Fix:** `export type TypeBadgeProps = { type: string }` → `export interface TypeBadgeProps { type: string }`; `handlers: ReadonlyArray<() => void>` → `handlers: readonly (() => void)[]`. Same fix pattern as Plan-02 SUMMARY deviation #3.
- **Files modified:** `src/components/ui/TypeBadge.tsx`, `src/hooks/useMoveHotkeys.ts`
- **Commit:** `0feb81f`

**2. [Rule 1 — Bug] Non-null assertion forbidden in tests/app.test.tsx**

- **Found during:** Task 2 (`npm run lint`)
- **Issue:** `typescript-eslint/strict` flags `@typescript-eslint/no-non-null-assertion` as an error. The plan's pseudocode used `root!.className` and `footer!.className`.
- **Fix:** Replaced with explicit `if (!root) throw new Error(...)` narrowing pattern (same fix as Plan-01 SUMMARY deviation #4).
- **Files modified:** `tests/app.test.tsx`
- **Commit:** `f1d511a`

**3. [Rule 3 — Blocker] Vitest 2 `test.projects` config did not route new `*.test.tsx` files to jsdom**

- **Found during:** Task 2 (`npm test`)
- **Issue:** The plan-01 `vitest.config.ts` configured `test.projects = [{name:'engine', env:'node'}, {name:'ui', env:'jsdom'}]`. With this config, the 27 new component/app tests still ran in node env (`ReferenceError: document is not defined`), and `--project ui` returned "No test files found" — the same bug Plan-02 SUMMARY documented as "Out-of-scope discovery". Forcing this could not wait — Plan 04 IS the first plan that actually needs jsdom-routed tests.
- **Fix:** Migrated multi-project setup to `vitest.workspace.ts` using `defineWorkspace([...])`. The workspace file is the canonical Vitest 2 pattern for multi-environment routing. `vitest.config.ts` retains only the path alias. After migration, the verbose runner correctly tags every test with `|engine|` or `|ui|` and routes accordingly. All 118 tests pass, no regression in the 91 pre-existing tests.
- **Files modified:** `vitest.config.ts`, `vitest.workspace.ts` (new)
- **Commit:** `f1d511a`

**4. [Rule 1 — Bug] RTL 16 + Vitest 2 do not auto-cleanup mounted nodes between tests**

- **Found during:** Task 2 (`npm test` after fix #3 — 6 tests still failing with "Found multiple elements with role 'button' name /ok/i")
- **Issue:** `@testing-library/react@16` removed the implicit `afterEach(cleanup)` global hook for non-Jest runners. Vitest 2 does not auto-wire it either. Without explicit cleanup, the previous test's mounted DOM nodes leak into the next test, breaking single-element queries like `getByRole('button', { name: /ok/i })`.
- **Fix:** Added to `tests/setup.ts`: `import { afterEach } from 'vitest'; import { cleanup } from '@testing-library/react'; afterEach(cleanup);`. The setup file is wired into the ui project via `setupFiles: ['./tests/setup.ts']` in `vitest.workspace.ts`.
- **Files modified:** `tests/setup.ts`
- **Commit:** `f1d511a`

### Authentication Gates

None — local component implementation, no network, no auth.

### Out-of-scope Discoveries

None.

## Stub Debt for Later Phases

| Stub | File | Phase to wire | Requirement | Notes |
|---|---|---|---|---|
| AriaLive content | `src/components/layout/AriaLive.tsx` | Phase 4 | A11Y-04 / BATT-04 | The component exists with the correct ARIA contract; Phase 4 mounts it inside the BattleScreen and pipes the rolling 8-message battle log into `children`. |
| useMoveHotkeys keydown listener | `src/hooks/useMoveHotkeys.ts` | Phase 4 | A11Y-03 / BATT-02 | The hook signature is final; Phase 4 implements the `window.addEventListener('keydown', ...)` body inside the existing `useEffect`. |

These are intentional Phase-1 stubs (the plan explicitly marks them as such — "patterns documented, full impl deferred") and are NOT undocumented placeholder data. Not flagged as blocking stubs.

## Threat Flags

None — UI primitives render text and Tailwind classes only. No new network endpoints, no auth paths, no user input parsing in this plan, no file/storage access, no schema changes at trust boundaries. Matches the plan's frontmatter `threat_model: "No threats — UI primitive components rendering text and Tailwind classes."`. Re-evaluate in Phase 3 when form inputs (e.g. settings, naming) and localStorage IO arrive.

## Self-Check: PASSED

- **Created files exist** (verified via `ls`): `src/components/ui/Button.tsx`, `src/components/ui/TypeBadge.tsx`, `src/components/layout/Disclaimer.tsx`, `src/components/layout/AriaLive.tsx`, `src/hooks/useMoveHotkeys.ts`, `src/components/ui/Button.test.tsx`, `src/components/ui/TypeBadge.test.tsx`, `tests/app.test.tsx`, `vitest.workspace.ts`. All present.
- **Modified files updated** (verified via `git diff` in commits): `src/App.tsx`, `tests/setup.ts`, `vitest.config.ts`. All show expected changes.
- **Commits exist:** `0feb81f` (Task 1 — UI primitives + a11y/mobile baseline) and `f1d511a` (Task 2 — App shell + RTL tests + workspace + cleanup fix). Both confirmed via `git log --oneline`.
- **All quality gates green:** `npm test` (118/118), `npm run lint` (max-warnings 0), `npx tsc --noEmit`, `npm run build` (dist with disclaimer string) — all exit 0.
- **Phase 1 success-criterion #6 fully met:** Type badges show TEXT (A11Y-01), buttons have visible focus rings (A11Y-02), 44×44 tap targets (MOBILE-01), `touch-action: manipulation` (MOBILE-03), layout uses `100dvh` (MOBILE-02). A11Y-03 + A11Y-04 patterns documented in stubs for Phase 4.
- **All 5 component/hook files are ≤ 150 lines** (CLAUDE.md constraint): Button 32, TypeBadge 40, Disclaimer 12, AriaLive 15, useMoveHotkeys 26 — well under budget.
