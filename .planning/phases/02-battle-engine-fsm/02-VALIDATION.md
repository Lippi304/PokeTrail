---
phase: 02
slug: battle-engine-fsm
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 02-RESEARCH.md §"Validation Architecture"

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `vitest.workspace.ts` (workspace `engine`, env `node`) |
| **Quick run command** | `npm run test:engine` (engine workspace only, ~<1s) |
| **Full suite command** | `npm test` (engine + ui workspaces, ~600ms baseline + Phase 2 adds) |
| **Estimated runtime** | ~1-2 s full suite |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:engine`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** `npm test && npm run lint --max-warnings 0 && npx tsc --noEmit` all exit 0
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| ENG-06 | `BattlePhase`-Union exports all 9 phases | unit (TS-Compile + runtime) | `npx tsc --noEmit && npm run test:engine -- battleMachine.test.ts -t "BattlePhase union"` | ❌ W0 | ⬜ pending |
| ENG-06 | `isLegal(phase, action)` exhaustive over 9×5 phase×action matrix | unit (`it.each` table) | `npm run test:engine -- battleMachine.test.ts -t "isLegal"` | ❌ W0 | ⬜ pending |
| ENG-06 | Reducer transitions full chain `selecting → … → battleOver` deterministically under fixed seed | integration (Charmander-vs-Bulbasaur 1v1) | `npm run test:engine -- battleMachine.test.ts -t "Charmander vs Bulbasaur"` | ❌ W0 | ⬜ pending |
| ENG-06 | Mid-resolution faint check prevents second mover when first mover OHKOs | unit (scripted RNG) | `npm run test:engine -- battleMachine.test.ts -t "faint mid-turn"` | ❌ W0 | ⬜ pending |
| ENG-06 | Resolution order: priority > speed > rng-tiebreak; RNG only on speed-tie | unit (3 cases × counter-delta) | `npm run test:engine -- battleMachine.test.ts -t "resolution order"` | ❌ W0 | ⬜ pending |
| ENG-06 | `BattleEvent` stream emits `turnStart`/`moveUsed`/`damageDealt`/`hpChanged`/`turnEnd`/`battleEnded` in order | integration (event-sequence assert) | `npm run test:engine -- battleMachine.test.ts -t "event sequence"` | ❌ W0 | ⬜ pending |
| ENG-09 | `selectMove(state, rng, 'random')` returns 0..3 ∈ legal moves | unit | `npm run test:engine -- ai.test.ts -t "random returns legal"` | ❌ W0 | ⬜ pending |
| ENG-09 | `selectMove` deterministic under identical state + RNG counter | unit | `npm run test:engine -- ai.test.ts -t "deterministic"` | ❌ W0 | ⬜ pending |
| ENG-09 | `selectMove` consumes exactly one RNG step per call | unit (counter Δ == 1) | `npm run test:engine -- ai.test.ts -t "rng counter"` | ❌ W0 | ⬜ pending |
| AI-01 | Wild AI = `selectMove(_, _, 'random')` (covered by ENG-09) | unit (alias check) | siehe ENG-09 | ❌ W0 | ⬜ pending |
| D-14 | `battleMachine.ts` + `ai.ts` contain no `react`/`Math.random`/`Date.now`/`new Date` | lint (Phase-1 ESLint test) | `npm run lint && npm test -- eslint-engine-purity` | ✅ existing | ⬜ pending |
| D-14 | No `src/data/**` imports inside `battleMachine.ts` or `ai.ts` | grep + lint | `! grep -rE "from ['\"]\\.\\./data" src/engine/battleMachine.ts src/engine/ai.ts` | ✅ implicit (lint) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · W0 = blocked on Wave 0 file creation*

---

## Wave 0 Requirements

- [ ] `src/engine/__tests__/battleMachine.test.ts` — covers ENG-06 (union, isLegal, step, scenario, mid-faint, event-stream, resolution-order)
- [ ] `src/engine/__tests__/ai.test.ts` — covers ENG-09 + AI-01 (random, deterministic, RNG-counter delta)
- [ ] `src/engine/__tests__/battle-fixtures.ts` — Test helpers (`makeCharmander`, `makeBulbasaur`, `makeMove`, `makeFixtureChart`, `makeInitialBattleState`); **NOT** `*.test.ts` so Vitest doesn't pick it as a test file
- [ ] **Wave-0 probe-run step in plan**: Execute scenario with `expect.any(...)` placeholders, log winner / final HPs / RNG-counter / event-count, then commit as hard-locks (Phase-1 `golden-baseline.ts` pattern adapted)
- [ ] `package.json` script `"test:engine": "vitest run --project engine"` if not yet present

*All Phase-1 infrastructure (vitest.workspace.ts, eslint engine-purity test, tsconfig strict) carries over — no new tooling needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| (none) | — | All Phase-2 behaviors are pure-function transformations with full automated coverage | — |

*All phase behaviors have automated verification. No UI in Phase 2 → no UAT visual checks needed. `/gsd-verify-work 2` will be a one-question UAT: "does `npm test` pass with the deterministic Charmander-vs-Bulbasaur scenario?"*

---

## Nyquist 2× Coverage Argument

ENG-06 is FSM correctness. Nyquist principle: cover every FSM transition **twice** —
once as an isolated unit test (`isLegal` table, individual reducer step) and once
as integration in the end-to-end scenario. This catches two regression classes:

- (a) `isLegal` correct but `step()` wrong → only the scenario catches this
- (b) Scenario happy-path passes but `forceSwitch` subtly broken → only the
  `isLegal` table catches this

Both test layers required. Stat-stages skeleton fields (D-20) are also covered
by a unit test asserting their default value `0` — no apply-logic in scope, but
the shape is locked.

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave-0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (3 new test files + 1 probe-run step)
- [ ] No watch-mode flags (`vitest run`, never `vitest`)
- [ ] Feedback latency < 2 s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner approves)

**Approval:** pending
