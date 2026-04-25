---
phase: 1
slug: foundation-toolchain-engine-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x (`vitest@^2.1.9`) — D-15 |
| **Config file** | `vitest.config.ts` (split into `engine` and `ui` projects) |
| **Quick run command** | `npx vitest run --project engine` |
| **Full suite command** | `npm test` (alias for `vitest run`, runs both projects) |
| **Estimated runtime** | ~50 ms engine-only / ~3 s full suite (Wave 0 estimate) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --project engine`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite + `npm run lint --max-warnings 0` + `npx tsc --noEmit` + `npm run build` must all be green; Vercel deploy URL must serve disclaimer
- **Max feedback latency:** ~3 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-XX-01 | TBD | 0 | FOUND-01 | — | `npm run dev` boots without error | smoke | manual `npm run dev` + curl localhost | ❌ W0 | ⬜ pending |
| 1-XX-02 | TBD | 0 | FOUND-02 | — | Tailwind v4 utilities apply | smoke | manual: rendered button has `min-h-[44px]` computed | ❌ W0 | ⬜ pending |
| 1-XX-03 | TBD | 0 | FOUND-03 | — | TS strict rejects `any` | unit (compile) | `npx tsc --noEmit` exits 0 | ❌ W0 | ⬜ pending |
| 1-XX-04 | TBD | 0 | FOUND-04 | — | Vitest reports green | smoke | `npm test` exits 0 | ❌ W0 | ⬜ pending |
| 1-XX-05 | TBD | 1 | FOUND-05 | — | ESLint blocks `react` import in `engine/**` | unit (lint) | `tests/eslint-engine-purity.test.ts` runs ESLint API on fixture | ❌ W0 | ⬜ pending |
| 1-XX-06 | TBD | 2 | FOUND-06 | — | Vercel serves disclaimer | manual smoke | open Vercel URL, verify disclaimer matches D-03 | ❌ manual | ⬜ pending |
| 1-XX-07 | TBD | 0 | FOUND-07 | — | Repo files exist | unit | `tests/repo-shape.test.ts` asserts `.gitignore`, `.editorconfig`, `.prettierrc`, `README.md` | ❌ W0 | ⬜ pending |
| 1-XX-08 | TBD | 1 | DATA-01..04 | — | Build script writes valid JSON + 151 sprites | integration | `npx tsx scripts/fetch-pokemon-gen1.ts && node -e "require('./src/data/pokemon-gen1.json').length === 151"` | ❌ W0 | ⬜ pending |
| 1-XX-09 | TBD | 1 | DATA-05 | — | Module-init Zod re-validation works | unit | `tests/data-revalidation.test.ts` (good fixture must not throw, bad fixture must throw) | ❌ W0 | ⬜ pending |
| 1-XX-10 | TBD | 1 | ENG-01 | — | mulberry32 deterministic | unit | `npx vitest run src/engine/__tests__/rng.test.ts` | ❌ W0 | ⬜ pending |
| 1-XX-11 | TBD | 1 | ENG-02 | — | Type chart resolves single + dual | unit | `npx vitest run src/engine/__tests__/typeChart.test.ts` (≥ 30 spot-checks) | ❌ W0 | ⬜ pending |
| 1-XX-12 | TBD | 1 | ENG-03/04 | — | Damage formula + ≥ 20 Smogon golden cases | unit (golden table) | `npx vitest run src/engine/__tests__/damage.test.ts` | ❌ W0 | ⬜ pending |
| 1-XX-13 | TBD | 1 | ENG-05 | — | Accuracy 70% floor + RNG | unit | `npx vitest run src/engine/__tests__/accuracy.test.ts` | ❌ W0 | ⬜ pending |
| 1-XX-14 | TBD | 2 | A11Y-01 | — | TypeBadge always renders text label | unit (RTL) | `getByText(/fire/i)` resolves on `<TypeBadge type="fire">` | ❌ W0 | ⬜ pending |
| 1-XX-15 | TBD | 2 | A11Y-02 | — | Button has visible focus ring | unit (className) | `expect(btn.className).toMatch(/focus-visible:ring-2/)` | ❌ W0 | ⬜ pending |
| 1-XX-16 | TBD | 2 | A11Y-03 | — | Keys 1–4 hook pattern documented | manual | placeholder hook + comment in `src/hooks/useMoveHotkeys.ts` | ❌ manual | ⬜ pending |
| 1-XX-17 | TBD | 2 | A11Y-04 | — | `aria-live` region pattern documented | manual | placeholder in `src/components/layout/AriaLive.tsx` | ❌ manual | ⬜ pending |
| 1-XX-18 | TBD | 2 | MOBILE-01 | — | Buttons ≥ 44×44px | unit (className) | `expect(btn.className).toMatch(/min-h-\[44px\]/)` | ❌ W0 | ⬜ pending |
| 1-XX-19 | TBD | 2 | MOBILE-02 | — | Layout uses `100dvh` | unit (className) | `expect(rootDiv.className).toMatch(/min-h-\[100dvh\]/)` | ❌ W0 | ⬜ pending |
| 1-XX-20 | TBD | 2 | MOBILE-03 | — | `touch-action: manipulation` set | unit (className) | `expect(btn.className).toMatch(/touch-manipulation/)` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Plan IDs filled in once `gsd-planner` writes PLAN.md files.*

---

## Wave 0 Requirements

Greenfield project — no test infrastructure exists yet. Wave 0 must create:

- [ ] Install: `npm install --save-dev vitest@^2 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/dom@^10 jsdom@^25`
- [ ] `vitest.config.ts` — Vitest 2 with `test.projects` for engine (node env) + ui (jsdom env)
- [ ] `tests/setup.ts` — `@testing-library/jest-dom` matchers + jsdom env setup
- [ ] `tests/repo-shape.test.ts` — stub for FOUND-07
- [ ] `tests/eslint-engine-purity.test.ts` — stub for FOUND-05 (programmatic ESLint API)
- [ ] `tests/data-revalidation.test.ts` — stub for DATA-05
- [ ] `src/engine/__tests__/rng.test.ts` — stub for ENG-01
- [ ] `src/engine/__tests__/typeChart.test.ts` — stub for ENG-02
- [ ] `src/engine/__tests__/damage.test.ts` — stub for ENG-03/04 (≥ 20 golden cases via `it.each`)
- [ ] `src/engine/__tests__/accuracy.test.ts` — stub for ENG-05
- [ ] `src/components/ui/Button.test.tsx` — stub for A11Y-02 / MOBILE-01 / MOBILE-03
- [ ] `src/components/ui/TypeBadge.test.tsx` — stub for A11Y-01

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel deploy serves disclaimer text | FOUND-06 | Production deploy is external | Open the Vercel preview URL; confirm disclaimer copy matches D-03 (locked text from CONTEXT.md) |
| Tailwind v4 utility classes render correctly | FOUND-02 | Cross-browser visual | Run `npm run dev`, open `http://localhost:5173`, inspect a `<Button>` and confirm `min-h: 44px` and dark `#0a0a0a` background apply |
| Keyboard hotkeys 1–4 select moves | A11Y-03 | Phase 1 only documents the pattern (full impl in Phase 4) | Confirm `src/hooks/useMoveHotkeys.ts` placeholder exists with TODO comment referencing Phase 4 |
| `aria-live` battle log pattern | A11Y-04 | Phase 1 only documents the pattern (full impl in Phase 4) | Confirm `src/components/layout/AriaLive.tsx` placeholder exists with TODO comment referencing Phase 4 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3 s
- [ ] `nyquist_compliant: true` set in frontmatter once planner finalises Plan/Wave/Task IDs

**Approval:** pending
