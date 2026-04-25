---
phase: 02-battle-engine-fsm
plan: 02
subsystem: engine
tags: [engine, pure-typescript, reducer-logic, resolution-order, ai-strategy, battle-events, wave-2]
requires:
  - engine-core (Phase 1 / 01-02): rng.ts, damage.ts, accuracy.ts, typeChart.ts, types.ts
  - 02-01 skeleton: BattlePhase/BattleAction/BattleEvent unions, isLegal table, reducer entry guard
provides:
  - src/engine/types.ts MoveLike additively gains optional `accuracy?: number | null` and `name?: string` (Phase-1 fixtures still type-check)
  - src/engine/ai.ts (36 lines): selectMove(state, rng, 'random'): MoveIndex; AiStrategy union extensible per D-25; consumes EXACTLY 1 RNG step per call (Pitfall 6)
  - src/engine/battleResolution.ts (31 lines): resolveOrder(playerMove, enemyMove, playerSpeed, enemySpeed, rng) → ['player','enemy'] | ['enemy','player']; rng.chance(0.5) consumed ONLY on speed-tie (Pitfall 4)
  - src/engine/battleMachine.ts (391 lines): full 1v1 reducer with handleSelecting/handleResolving/handleTurnEnd/handleFaintCheck; auto-advance loop converges in a single dispatch; emits the locked event stream per Pattern 3
  - src/engine/__tests__/battle-fixtures.ts (202 lines, NOT a *.test.ts): makeCharmander, makeBulbasaur, makeMove, makeFixtureChart, makeInitialBattleState — handcrafted, decoupled from src/data/** per A5
  - src/engine/__tests__/battleResolution.test.ts (94 lines, 4 tests R1-R4)
  - src/engine/__tests__/ai.test.ts (110 lines, 7 tests A1-A6 incl. zero-moves edge case)
  - src/engine/__tests__/battleMachine.test.ts (496 lines, 59 tests = 53 prior + 6 new M1-M6)
affects:
  - downstream Plan 02-03: now has battle-fixtures + a working reducer to drive a Charmander-vs-Bulbasaur deterministic scenario; the RNG counter sequence is locked and ready to be probed for golden values
  - Phase 4 UI: ReducerOutput.events stream is now real and ordered per Pattern 3; UI animation triggers can be wired byte-for-byte
tech-stack:
  added: []
  patterns:
    - Strategy-pattern AI with assertNever-protected default (Phase 8 extension axis)
    - Pure helper resolveOrder for priority → speed → RNG-tiebreak (RNG only on tie)
    - Mid-resolution faint check via mutable HP scratch in handleResolving (Pitfall 2 — second mover skipped if KO'd by first)
    - Immer's `produce` for Phase-2 reducer state updates (depth-2 nested combatants.player.hp)
    - Mutable scratch HP + single Immer commit at end of handleResolving (avoids per-event draft churn)
    - Auto-advance loop with defensive "no transition occurred" guard to prevent pathological infinite loops
    - Locked RNG consumption order documented in battleMachine.ts file header (load-bearing for Plan 02-03 + future save/replay)
    - Test fixtures decoupled from src/data/** (A5): handcrafted Charmander/Bulbasaur/fixture-chart so engine plans can test without DATA-01..05 being shipped first
    - Scripted-RNG helper inline in test file for forced-miss / forced-no-crit edge cases (battleMachine.test.ts)
key-files:
  created:
    - src/engine/ai.ts
    - src/engine/battleResolution.ts
    - src/engine/__tests__/battle-fixtures.ts
    - src/engine/__tests__/ai.test.ts
    - src/engine/__tests__/battleResolution.test.ts
  modified:
    - src/engine/types.ts (MoveLike extended with optional accuracy + name)
    - src/engine/battleMachine.ts (skeleton step()-throws replaced with real handlers; reducer entry + isLegal table + LEGAL_ACTIONS untouched per Plan-02-01 preservation contract)
    - src/engine/__tests__/battleMachine.test.ts (extended with M1-M6 reducer-logic tests)
key-decisions:
  - D-23 implemented (resolveOrder: priority → speed → RNG-tiebreak; RNG consumed only on speed-tie; 4 unit tests assert counter-delta)
  - D-24 implemented (BattleEvent stream emitted in the locked Pattern-3 order; M4 test asserts moveUsed → superEffective → damageDealt → hpChanged ordering byte-for-byte)
  - D-25 implemented (selectMove single-entry-point with 'random' strategy; AiStrategy union extensible to 'gymPriority' etc. without API break)
  - AI-01 implemented (Wild AI picks legal random move with deterministic RNG consumption — exactly 1 step per call regardless of moves.length)
  - ENG-06 implemented (full 1v1 FSM wired: selecting → resolving → animatingPlayer → animatingEnemy → turnEnd → faintCheck → battleOver in a single auto-advanced dispatch)
  - ENG-09 implemented (engine/ai.ts ships)
  - D-14 holds (engine purity verified via lint + manual grep on all new files: no react/Math.random/Date.now/new Date/src/data/** imports)
requirements:
  - ENG-06
  - ENG-09
  - AI-01
metrics:
  duration: ~6 min
  tasks_completed: 2
  files_created: 5
  files_modified: 3
  commits: 2
  completed_date: 2026-04-25
---

# Phase 2 Plan 2: Reducer Logic + AI + Battle Fixtures Summary

Reducer wiring for Phase 2: 02-01 skeleton's eight `throw new Error('not implemented')` per-phase stubs in `step()` are replaced with real handlers (`handleSelecting`, `handleResolving`, `handleTurnEnd`, `handleFaintCheck`) plus pass-through `animatingPlayer`/`animatingEnemy` and Phase-5/6-deferred throws for `forceSwitch`/`enemyFaintReward` — `selectMove(state, rng, 'random')` (D-25/AI-01) consumes exactly 1 RNG step per call (Pitfall 6 lock), `resolveOrder` (D-23) consumes 1 RNG step ONLY on speed-tie (Pitfall 4 lock), and the BattleEvent stream emits in the locked `moveUsed → (moveMissed | (crit?) → (effectiveness?) → damageDealt → hpChanged → (fainted?))` order per Pattern 3, with mid-resolution faint check preventing the second mover from acting after a first-mover OHKO (Pitfall 2). 11 new tests across `ai.test.ts` (7), `battleResolution.test.ts` (4), and `battleMachine.test.ts` (6 new M1-M6) take the suite from 171 to 188 passing — no regressions, lint exit 0, tsc exit 0.

## What Shipped

### New source files

| File | Lines | Purpose |
|------|------:|---------|
| `src/engine/ai.ts` | 36 | `selectMove(state, rng, 'random'): MoveIndex` — D-25 strategy-pattern AI; `AiStrategy = 'random'` (Phase 8 extends to `'gymPriority' \| 'gymPrioritySwitch'`) |
| `src/engine/battleResolution.ts` | 31 | `resolveOrder(playerMove, enemyMove, playerSpeed, enemySpeed, rng): ['player','enemy'] \| ['enemy','player']` — D-23 priority → speed → RNG-tiebreak |
| `src/engine/__tests__/battle-fixtures.ts` | 202 | `makeCharmander`, `makeBulbasaur`, `makeMove`, `makeFixtureChart`, `makeInitialBattleState` — handcrafted (decoupled from src/data/** per A5) |
| `src/engine/__tests__/ai.test.ts` | 110 | 7 tests: A1 legal index, A2 same-seed determinism, A3 player-state-mutation invariance, A4 RNG counter delta = 1, A4b 1-move edge case, A5 unknown-strategy throws, A6 zero-moves throws |
| `src/engine/__tests__/battleResolution.test.ts` | 94 | 4 tests: R1 priority dominates speed (counter delta 0), R2 speed dominates equal-priority (counter delta 0), R3 speed-tie consumes 1 RNG (deterministic), R4 missing priority defaults to 0 |

### Modified files

| File | Change |
|------|--------|
| `src/engine/types.ts` | `MoveLike` gains optional `accuracy?: number \| null` (forwarded to `rollAccuracy` via `move.accuracy ?? null`) and `name?: string` (read by `moveUsed` event as `move.name ?? '???'`); both additive — Phase-1 fixtures still compile |
| `src/engine/battleMachine.ts` | Skeleton `step()` per-phase `throw new Error('...not implemented in skeleton...')` stubs replaced with handlers. `reducer()` entry, `isLegal` table, `LEGAL_ACTIONS`, `BattleContext`, `ReducerOutput`, `assertNever`, `isAutoPhase` preserved. Adds `handleSelecting`, `handleResolving`, `handleTurnEnd`, `handleFaintCheck`, `advance` helpers. Imports `immer.produce`, `./damage.calculateDamage`, `./accuracy.rollAccuracy`, `./typeChart.getTypeMultiplier`, `./battleResolution.resolveOrder`, `./ai.selectMove`. Auto-advance loop adds a defensive "no transition occurred" guard to prevent pathological infinite loops |
| `src/engine/__tests__/battleMachine.test.ts` | 6 new tests M1-M6 appended; existing 53 isLegal + reducer-throw tests preserved byte-for-byte. Inline `scriptedRng()` helper for forced-miss / forced-no-crit edge cases |

### Test counts

| Section | Tests | Status |
|---------|------:|--------|
| Phase 1 (rng/typeChart/damage/accuracy + UI + repo-shape + eslint-purity) | 118 | ✅ green (no regressions) |
| Phase 2 Plan 01 (53 tests in battleMachine.test.ts) | 53 | ✅ green (preserved) |
| Phase 2 Plan 02 ai.test.ts (A1-A6 incl. A4b) | 7 | ✅ green |
| Phase 2 Plan 02 battleResolution.test.ts (R1-R4) | 4 | ✅ green |
| Phase 2 Plan 02 battleMachine.test.ts (M1-M6 new) | 6 | ✅ green |
| **Total** | **188** | ✅ |

## Quality-Gate Evidence

```
$ npm run lint                                # exit 0 (no engine-purity violations, no non-null assertions)
$ npx tsc --noEmit                            # exit 0
$ npx vitest run --project engine             # 134 engine tests (123 prior + 11 new) passing
$ npm test                                    # 188 / 188 passing across 13 files (~975 ms)
$ grep -E "from 'react'|Math\.random|Date\.now|new Date" \
    src/engine/ai.ts src/engine/battleResolution.ts \
    src/engine/battleMachine.ts \
    src/engine/__tests__/battle-fixtures.ts
                                              # only matches doc-comments (e.g. "Engine-pure: no react, no Math.random, ...")
$ grep -E "from ['\"](\\.\\./)?data" src/engine/battleMachine.ts \
    src/engine/ai.ts src/engine/battleResolution.ts \
    src/engine/__tests__/battle-fixtures.ts
                                              # no matches
$ grep -c "throw new Error" src/engine/battleMachine.ts
9                                             # was 9 in 02-01 (8 stub + 1 illegal-action) — 8 stub-throws replaced;
                                              # new throws: forceSwitch+enemyFaintReward placeholders, handleSelecting non-pickMove,
                                              # handleResolving null pendingAction + 2 missing-move guards, auto-advance stuck guard,
                                              # assertNever default, plus the original isLegal-illegal-action throw.
```

ESLint engine-purity test (`tests/eslint-engine-purity.test.ts`) continues to pass — the boundary is enforced at lint time, not just intent.

## Decisions Implemented

| ID | Decision | Where |
|---|---|---|
| D-23 | Modern Smogon resolution: priority → speed → RNG-tiebreak; RNG consumed only on speed-tie | `battleResolution.ts` (3 short-circuits before `rng.chance`); `battleResolution.test.ts` R1+R2+R4 prove counter delta 0; R3 proves counter delta 1 on tie |
| D-24 | Reducer output `{state, events}` with rich BattleEvent stream in locked Pattern-3 order | `handleResolving` emits per mover: `moveUsed` → `moveMissed` OR (`crit?` → `superEffective?\|notVeryEffective?\|noEffect?` → `damageDealt` → `hpChanged` → `fainted?`); `battleMachine.test.ts` M4 asserts the order byte-for-byte; M3 asserts the miss-branch |
| D-25 | Single-entry-point AI API with `AiStrategy` union | `ai.ts` exports `selectMove + AiStrategy = 'random'`; switch-case + assertNever-default ready for Phase-8 `\| 'gymPriority' \| 'gymPrioritySwitch'` extension |
| AI-01 | Wild AI picks legal random move; deterministic | `selectMove(state, rng, 'random')` calls `rng.nextInt(0, moves.length-1)` exactly once; A4 + A4b assert counter delta = 1 even with `moves.length === 1` (Pitfall 6 — replay safety between 1-move and 4-move battles) |
| ENG-06 | Full 1v1 FSM wired | All 6 auto-advanceable phases handled; `handleFaintCheck` routes 1v1-fainted → `battleOver` directly (no forceSwitch); M5 asserts auto-advance terminates only at `selecting` or `battleOver` |
| ENG-09 | `engine/ai.ts` ships | `src/engine/ai.ts` (36 lines, no data imports, ESLint-clean) |
| D-14 (vererbt) | Engine purity (no react/Math.random/Date.now/new Date/src/data/**) | All new files lint-clean; manual grep finds only doc-comments mentioning the rule |

## Patterns Locked for Downstream Plans

- **RNG consumption order is API.** `battleMachine.ts` file header documents the exact per-turn sequence. Plan 02-03's probe-run will lock golden RNG-counter values against this; if Plan-02-03 finds a mismatch, the FIX is in code (this plan), not in the docs.

  ```
  Per pickMove dispatch from selecting:
    1) AI selectMove → 1 RNG step (start of handleResolving, BEFORE resolveOrder)
    2) resolveOrder speed-tie → 1 RNG step ONLY if priorities + speeds equal
    3) For first mover (per resolveOrder):
         3a) accuracy → 1 step (skipped if move.accuracy === null)
         3b) crit    → 1 step inside calculateDamage (only if hit + non-status + non-immune)
         3c) random  → 1 step inside calculateDamage (same conditions)
    4) For second mover (only if not KO'd by first): same 3a-3c.
  ```

- **Event-order contract per mover (Pattern 3 from 02-RESEARCH).** Plan 02-03's integration test will assert this stream byte-for-byte:

  ```
  moveUsed
   → moveMissed
   | (crit?) → (superEffective | notVeryEffective | noEffect)?
             → damageDealt → hpChanged → (fainted)?
  ```

- **Mid-resolution faint check (Pitfall 2)** lives INSIDE `handleResolving` as a `if (moverHp <= 0) continue` guard at the top of the per-mover loop — NOT as its own FSM phase. The `faintCheck` FSM phase handles end-of-turn (battleOver-or-next-turn) routing only.

- **Fixtures decoupled from data layer (A5).** `battle-fixtures.ts` lives in `__tests__/` and never imports from `src/data/**`. This lets Phase-2 plans run before DATA-01..05 ship; Phase-3 (data loader) can later add an `__integration__` fixture wired to the real `src/data/pokemon-gen1.json` if desired.

- **Immer's `produce` for reducer state updates.** Used everywhere battleMachine.ts mutates BattleState. The mutable-HP-scratch + single-final-`produce`-call pattern in `handleResolving` keeps the per-event work in plain numbers and only commits to Immer once at the end — avoids draft churn during the per-mover loop while preserving immutability.

- **Auto-advance-stuck guard.** `reducer()` throws `"Reducer auto-advance stuck in phase X — no transition occurred"` if any auto-phase handler returns the same phase. Defensive — the current handlers always transition — but catches future regressions before they become infinite loops in production.

- **Scripted-RNG helper for forced-edge tests.** Inline in `battleMachine.test.ts` (not exported) for use cases like "force a miss" or "force no crit". Pops values from a fixed array, throws on exhaustion to surface off-by-one consumption bugs in tests. If Plan 02-03 needs the same helper, lift it to `__tests__/test-rng.ts` (NOT a `*.test.ts`).

## RNG Counter Lock

For Plan 02-03's probe-run, the per-turn counter sequence (starting from `rng.counter === 0` at the start of a single `pickMove` dispatch) is:

| Step | Action | Counter after | Conditional |
|------|--------|---------------|-------------|
| 1 | AI `selectMove` (`nextInt`) | 1 | always |
| 2 | `resolveOrder` speed-tie (`chance(0.5)`) | +1 (= 2) | only if priorities + speeds tie |
| 3a | First mover: accuracy (`next`) | +1 | only if `move.accuracy !== null` |
| 3b | First mover: crit (`chance(1/24)`) | +1 | only if hit + non-status + non-immune |
| 3c | First mover: random factor (`next`) | +1 | same conditions as 3b |
| 4a | Second mover: accuracy | +1 | only if not KO'd + accuracy non-null |
| 4b | Second mover: crit | +1 | same conditions as 3b for second mover |
| 4c | Second mover: random factor | +1 | same conditions as 3b for second mover |

Typical "no-tie + both-hit + non-status" turn → counter delta = 1 + 0 + 3 + 3 = **7 per turn**.

Plan 02-03 should write the integration scenario, run it once with a fixed seed, log `rng.counter` + final HPs + `events.length`, then commit those values as hard-locks (Phase-1 `golden-baseline.ts` pattern).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed two non-null assertions in M4 test**
- **Found during:** post-Task-2 lint check
- **Issue:** Test M4 used `moveUsedIndices[0]!` and `moveUsedIndices[1]!` to extract array elements after a `length`-check. The project's `@typescript-eslint/no-non-null-assertion` rule is enabled (strict preset), so lint failed with 2 errors.
- **Fix:** Refactored to explicit `if (firstMoveUsed === undefined) throw new Error(...)` for the load-bearing extraction (M4 already had a `length >= 1` `expect` so the throw is unreachable in practice but appeases the type system) and a `secondMoveUsed !== undefined ? secondMoveUsed : out.events.length` ternary for the optional second-mover index.
- **Files modified:** `src/engine/__tests__/battleMachine.test.ts`
- **Commit:** included in Task 2 commit `a03ca57`
- **Why this is sound:** Same assertion semantics, no non-null-assertion. Sets the same precedent as Plan 02-01's deviation #2 (which also stripped a non-null assertion).

### Authentication Gates

None — pure local TypeScript, no network, no auth.

### Out-of-scope discoveries

None.

## Threat Flags

None — `battleMachine.ts`, `ai.ts`, `battleResolution.ts`, and the test fixtures are all pure-functions-over-numbers-and-strings layers per the plan's `threat_model: "No threats — pure TypeScript over numbers/strings, no I/O, no user input, no network."`. The mandatory threat scan checked all created/modified files: no new network endpoints, no auth paths, no file/storage access, no schema changes at trust boundaries. Engine-purity ESLint rules from Phase 1 (D-14) automatically apply to the new files and prevented any drift toward `react` / `Math.random` / `Date.now` / `new Date` / `src/data/**` imports.

## Self-Check: PASSED

- **Created files exist:**
  - `src/engine/ai.ts` (36 lines)
  - `src/engine/battleResolution.ts` (31 lines)
  - `src/engine/__tests__/battle-fixtures.ts` (202 lines)
  - `src/engine/__tests__/ai.test.ts` (110 lines)
  - `src/engine/__tests__/battleResolution.test.ts` (94 lines)
- **Modified files exist:**
  - `src/engine/battleMachine.ts` (391 lines, was 159)
  - `src/engine/types.ts` (MoveLike additive: +accuracy +name)
  - `src/engine/__tests__/battleMachine.test.ts` (496 lines, was 216)
- **Commits exist:** `5440014` (Task 1) + `a03ca57` (Task 2) — both confirmed via `git log --oneline -5`.
- **Quality gates:** `npm test` 188/188, `npm run lint` exit 0, `npx tsc --noEmit` exit 0, `npx vitest run --project engine` 134 engine tests (123 + 11 new).
- **Plan success criteria all met:**
  - [x] `selectMove(state, rng, 'random')` returns `0..3 ∈ legal moves`; consumes exactly 1 RNG step per call (A1, A4, A4b prove)
  - [x] `selectMove` deterministic under same seed + state (A2, A3 prove)
  - [x] `resolveOrder` returns priority → speed → RNG-tie order; no RNG consumption when speeds differ (R1, R2, R4 prove counter delta 0)
  - [x] Reducer auto-advances from `selecting → … → selecting (next turn) | battleOver` in a single dispatch (M1, M5 prove)
  - [x] Mid-turn faint check: second mover skipped if first OHKO'd them (M2 proves: enemy `fainted` event present, NO enemy `moveUsed` event)
  - [x] Event order matches the API lock: `moveUsed → (crit?) → (effectiveness?) → damageDealt → hpChanged → (fainted?)` per mover (M4 proves)
  - [x] Reducer is pure (input state not mutated; M6 `structuredClone` snapshot deep-equals after call)
  - [x] `battle-fixtures.ts` exports the 5 helpers — handcrafted, NOT from `src/data/**`
  - [x] No regressions: 171 prior tests still pass (188 total = 171 + 17 new across this plan)
  - [x] No `react` / `Math.random` / `Date.now` / `new Date` / `src/data/**` imports in any new source file (verified by lint + manual grep)
