---
phase: 02-battle-engine-fsm
plan: 01
subsystem: engine
tags: [engine, pure-typescript, fsm, discriminated-unions, types, wave-0]
requires:
  - engine-core (from 01-02): types.ts, rng.ts
  - vitest-split-engine-project (from 01-01): npm run test:engine
provides:
  - src/engine/types.ts extended with BattlePhase (9), BattleAction (5), BattleEvent (12), BattleParticipant, BattleState, StatStages, Side, MoveIndex; MoveLike gains optional priority?: number
  - src/engine/battleMachine.ts (159 lines): isLegal(phase, action) guard, reducer(state, action, rng, ctx) entry, BattleContext + ReducerOutput, step() skeleton, assertNever exhaustiveness check, isAutoPhase helper
  - src/engine/__tests__/battleMachine.test.ts (216 lines): 53 assertions — 5 type contract + 45 isLegal cells + 3 reducer-throw smoke tests
affects:
  - downstream Plan 02-02: must REPLACE step()'s per-phase throw with real handlers (handleSelecting/handleResolving/handleAnimating*/handleTurnEnd/handleFaintCheck/handleEnemyFaintReward) — must NOT modify isLegal table or reducer entry
  - downstream Plan 02-03: integration test against the locked BattlePhase × BattleAction × BattleEvent surface — pure additions, no source edits to battleMachine.ts
  - Phase 4 UI: will iterate ReducerOutput.events to drive animations + battle log
tech-stack:
  added: []
  patterns:
    - 9-phase FSM with as const satisfies-enforced legality table (D-21 + D-22)
    - Discriminated-union BattleEvent stream (D-24) — exhaustive per switch (e.type)
    - assertNever pattern in default branch — guarantees future BattlePhase variants are wired in step() at compile time
    - Reducer signature (state, action, rng, ctx) -> {state, events} per Phase-1 D-14 + Phase-2 D-24
    - Auto-advance loop in reducer entry (no-op in skeleton, load-bearing in Plan 02-02)
    - Throw-on-illegal-action (A6 fail-fast) — UI bugs surface loudly during dev
    - Inline test factories scoped to test file; shared battle-fixtures.ts deferred to Plan 02-02
key-files:
  created:
    - src/engine/battleMachine.ts
    - src/engine/__tests__/battleMachine.test.ts
  modified:
    - src/engine/types.ts (extended; existing 5 interfaces preserved)
key-decisions:
  - D-20 implemented (StatStages skeleton with 7 number fields, all init 0; logic deferred to Phase 6)
  - D-21 implemented (BattlePhase = 9-variant union, all variants exported from Day 1; Phase-2 tests fire only the subset that 1v1 reaches)
  - D-22 implemented (BattleAction = 5-variant union, all variants typed from Day 1; isLegal table locked verbatim from 02-RESEARCH §Pattern 1)
  - D-23 implemented (MoveLike.priority optional; default 0 read everywhere via `move.priority ?? 0`; preserves Phase-1 fixture compatibility)
  - D-24 partially implemented (BattleEvent union locked, ordering documented in JSDoc; emission logic comes in Plan 02-02)
  - D-25 honored (single-entry-point AI API not yet built — Plan 02-02 territory)
  - D-14 holds (engine purity verified: no react/Math.random/Date.now/new Date/src/data/** imports in new files)
requirements:
  - ENG-06
metrics:
  duration: ~7 min
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  commits: 2
  completed_date: 2026-04-25
---

# Phase 2 Plan 1: Battle Types + FSM Skeleton Summary

Type fundament + FSM skeleton reducer for Phase 2: extended types.ts with 8 new exports (Side, MoveIndex, BattlePhase, StatStages, BattleParticipant, BattleState, BattleAction, BattleEvent) plus optional priority on MoveLike, added `src/engine/battleMachine.ts` with the locked 9×5 isLegal lookup-table, fail-fast reducer entry that throws on illegal actions, and an assertNever-protected step() switch where 8 phases stub-throw "not implemented" and battleOver returns state unchanged — leaves Plan 02-02 a clean canvas to swap each throw for a real handler without touching the dispatch table or reducer entry.

## What Shipped

### Types (src/engine/types.ts — extended)

The existing 5 interfaces (`GenOneType`, `Combatant`, `MoveLike`, `DamageClass`, `TypeChart`) are preserved byte-for-byte; new exports were appended:

- **`Side`** — `'player' | 'enemy'`
- **`MoveIndex`** — `0 | 1 | 2 | 3` (4-slot Gen-1 move tuple)
- **`BattlePhase`** — 9-variant union per D-21 (selecting / resolving / animatingPlayer / animatingEnemy / turnEnd / faintCheck / forceSwitch / enemyFaintReward / battleOver)
- **`StatStages`** — 7 number fields (atk/def/spA/spD/spe/acc/eva) per D-20; range -6..+6 documented in JSDoc; logic deferred to Phase 6
- **`BattleParticipant`** — extends Combatant with `hp`, `maxHp`, `speed`, `species`, `moves`, `statStages`
- **`BattleState`** — `{ phase, turnNumber, combatants: { player, enemy }, pendingPlayerAction }`
- **`BattleAction`** — 5-variant discriminated union per D-22 (pickMove/switchTo/useItem/run/continue)
- **`BattleEvent`** — 12-variant discriminated union per D-24 with turn-ordering documented in JSDoc (turnStart → moveUsed → [moveMissed | (crit?) → effectiveness → damageDealt → hpChanged → fainted?] for each mover → turnEnd → battleEnded?)
- **`MoveLike.priority?`** — additive optional field per D-23 / A1; engine reads `move.priority ?? 0` everywhere

### FSM skeleton (src/engine/battleMachine.ts — new, 159 lines)

```ts
export function isLegal(phase: BattlePhase, action: BattleAction): boolean
export interface BattleContext { typeChart: TypeChart }
export interface ReducerOutput { state: BattleState; events: BattleEvent[] }
export function reducer(state, action, rng, ctx): ReducerOutput
```

`LEGAL_ACTIONS` is the locked 9×5 truth-table from 02-RESEARCH §Pattern 1, frozen via `as const satisfies Record<BattlePhase, ReadonlySet<ActionType>>` so a future BattlePhase variant cannot slip in without a corresponding entry. `reducer()` throws `"Illegal action {action.type} in phase {state.phase}"` when isLegal returns false (A6 fail-fast); otherwise it dispatches into `step(state)` and auto-advances through internal phases until a user-input phase is reached. The skeleton dispatch loop is a no-op (every non-terminal case throws), but the loop topology is in place for Plan 02-02 to drop real handlers into.

`step()`'s default branch calls `assertNever(state.phase)` — adding a 10th BattlePhase later (e.g. multi-target battles in Phase 11) without updating the switch produces a compile error.

### Tests (src/engine/__tests__/battleMachine.test.ts — new, 216 lines)

| Section | Tests | What it locks |
|---|---:|---|
| Phase 2 types — Wave 0 contract | 5 | BattlePhase length+uniqueness, BattleAction 5-discriminator coverage, StatStages zero defaults, MoveLike.priority optionality, package.json scripts.test:engine value |
| isLegal — 9 × 5 phase × action coverage | 45 | Every cell of the locked truth-table, via `it.each` with named labels |
| Reducer throws on illegal action | 3 | battleOver+pickMove throws; error message names both action.type AND phase; battleOver+continue still throws (empty legal-set) |
| **Total** | **53** | |

Inline factories (`makeStatStages`, `makeParticipant`, `makeState`) live in the test file by design — Plan 02-02 will move them into a shared `battle-fixtures.ts` once the reducer-handler tests need them too. Centralizing now is premature.

## Quality-Gate Evidence

```
$ npm run lint                                # exit 0 (no engine-purity violations)
$ npx tsc --noEmit                            # exit 0
$ npx vitest run --project engine             # 64 engine tests (59 prior + 5 type-contract + 45 isLegal + 3 reducer-throw, but Task 1 added 5 + Task 2 added 48 → 53 new on this plan)
$ npm test                                    # 171 / 171 passing across 11 files (~940 ms)
$ grep -E "from 'react'|Math\.random|Date\.now|new Date" src/engine/battleMachine.ts src/engine/types.ts
                                              # only matches a comment string documenting the rule
$ grep -E "from ['\"]\\.\\./data" src/engine/battleMachine.ts
                                              # no matches
$ node -e "console.log(require('./package.json').scripts['test:engine'])"
                                              # vitest run --project engine
```

The Phase-1 ESLint engine-purity test (`tests/eslint-engine-purity.test.ts`) continues to pass on the new `battleMachine.ts` — the boundary is enforced at lint time, not just intent.

## Decisions Implemented

| ID | Decision | Where |
|---|---|---|
| D-20 | StatStages skeleton (7 fields, init 0); logic Phase 6 | `types.ts` — `StatStages` interface + `BattleParticipant.statStages`; `battleMachine.test.ts` Test 3 asserts all 7 fields default to 0 |
| D-21 | BattlePhase union ships all 9 variants from Day 1 | `types.ts` — `BattlePhase` union; `battleMachine.test.ts` Test 1 asserts length 9 + uniqueness; `battleMachine.ts` `LEGAL_ACTIONS` covers all 9 with `satisfies` enforcement; `step()` switch handles all 9 with `assertNever` default |
| D-22 | BattleAction union locked + isLegal guard ab Phase 2 | `types.ts` — `BattleAction` union; `battleMachine.ts` `LEGAL_ACTIONS` + `isLegal()`; `battleMachine.test.ts` Test 2 (5 discriminators) + 45 isLegal cells |
| D-23 | Move priority optional, default 0 | `types.ts` — `MoveLike.priority?: number`; `battleMachine.test.ts` Test 4 verifies optionality + `?? 0` semantics. Phase-1 damage tests still pass (additive change) |
| D-24 | Reducer output `{state, events}`; BattleEvent discriminated-union with documented ordering | `types.ts` — `BattleEvent` 12-variant union with JSDoc-documented turn order; `battleMachine.ts` `ReducerOutput` interface; `reducer()` returns `{state, events}` |
| D-14 (vererbt) | Engine purity (no react / Math.random / Date.now / new Date / src/data) | All new code under `src/engine/**` clean; ESLint engine-purity test still passes; manual grep finds only documentation comments mentioning the rule |

## Patterns Locked for Downstream Plans

- **Auto-advance reducer entry pattern**: `reducer()` runs `step()` once on the user-driven action, then loops `while (isAutoPhase(next.phase))` calling `step(next)` with synthetic continue-equivalents until the machine settles. Plan 02-02 implements the per-phase handlers; the loop topology is fixed.
- **Throw-on-illegal-action (A6)**: Every reducer call validates against `LEGAL_ACTIONS` first. UI bugs that fire wrong actions surface as exceptions in development, not as silent state corruption. The error message includes both `action.type` and `state.phase` for fast triage.
- **`as const satisfies`-enforced exhaustiveness in two places**: `LEGAL_ACTIONS` uses `satisfies Record<BattlePhase, ReadonlySet<ActionType>>` AND `step()` uses `assertNever(state.phase)` in its default branch. Adding a 10th BattlePhase produces a compile error in BOTH spots — exhaustiveness is dual-locked.
- **Chart-as-parameter via BattleContext**: The reducer accepts `ctx: { typeChart }` instead of importing from `src/data/**`. Same discipline as Phase-1's `getTypeMultiplier` — engine has zero data-layer coupling. Plan 02-02 will pass the ctx through to `calculateDamage` calls.
- **BattleEvent ordering as API**: The JSDoc on `BattleEvent` documents the turn sequence; Plan 02-03's integration test will assert exact event sequences. Plan 02-02 must emit events in the documented order — UI animations depend on this.
- **Inline-fixtures-first**: Plan 02-01 keeps test fixtures inline. Plan 02-02 will extract `makeCharmander`, `makeBulbasaur`, `makeMove`, `makeFixtureChart`, `makeInitialBattleState` into `src/engine/__tests__/battle-fixtures.ts` (NOT `*.test.ts` — Vitest must not pick it as a suite).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `step()` parameter shape narrowed for skeleton + `assertNever` extracted**
- **Found during:** Task 2 lint check after first GREEN
- **Issue:** The plan's Action block specified `step(state, action, rng, ctx, events)` with `_`-prefixed unused parameters and an inline `const _exhaustive: never = state.phase`. The project's typescript-eslint strict config does NOT have `argsIgnorePattern: '^_'` configured, so all four underscore-prefixed parameters AND the `_exhaustive` const tripped `@typescript-eslint/no-unused-vars`.
- **Fix:** (a) Narrowed skeleton `step()` signature to `step(state)` only — non-terminal cases throw without consuming action/rng/ctx/events anyway, and `battleOver` returns state. Plan 02-02 will widen the signature when handlers actually consume the inputs. (b) Added `void rng; void ctx; void events;` references inside `reducer()` to keep parameter intent observable for Plan-02-02 maintainers without triggering unused-vars. (c) Replaced the inline `_exhaustive` const with an explicit `assertNever(phase: never): never` helper function — same compile-time exhaustiveness guarantee, doesn't need `_`-prefix lint exception.
- **Files modified:** `src/engine/battleMachine.ts`
- **Why this is sound for Plan 02-02:** `step()` is a private function — widening its signature later is a non-breaking change. `assertNever` is the canonical TypeScript exhaustiveness pattern (often suggested by the TS team itself), so it sets a good precedent for future engine code.
- **Commit:** `bb26dc3`

**2. [Rule 3 - Blocking] Removed non-null-assertion in Test 8**
- **Found during:** Task 2 lint check
- **Issue:** Plan-spec Test 8 wrote `caught!.message.toMatch(...)`, but `@typescript-eslint/no-non-null-assertion` is enabled (strict preset). The lint exit was 1.
- **Fix:** Refactored Test 8 to use the `expect(() => reducer(...)).toThrow(/regex/)` form like Tests 7 and 9 — same assertion semantics, no non-null-assertion needed.
- **Files modified:** `src/engine/__tests__/battleMachine.test.ts`
- **Commit:** `bb26dc3`

### Authentication Gates

None — pure local TypeScript, no network, no auth.

### Out-of-scope discoveries

None.

## Threat Flags

None — `battleMachine.ts` is a pure-functions-over-numbers-and-strings layer per the plan's `threat_model: "No threats — pure TypeScript over numbers/strings, no I/O, no user input, no network."`. The mandatory threat scan checked `src/engine/types.ts` (type definitions only), `src/engine/battleMachine.ts` (no I/O, no network, no user-controlled-string-to-execution paths), and `src/engine/__tests__/battleMachine.test.ts` (only reads package.json from disk via `node:fs` to validate a script value — read-only, no execution). No new attack surface.

## Self-Check: PASSED

- **Created files exist:**
  - `src/engine/battleMachine.ts` (159 lines)
  - `src/engine/__tests__/battleMachine.test.ts` (216 lines)
  - `src/engine/types.ts` extended (183 lines, was 57)
- **Commits exist:** `669ba37` (Task 1) and `bb26dc3` (Task 2) both confirmed via `git log --oneline -5`.
- **Quality gates:** `npm test` 171/171, `npm run lint` exit 0, `npx tsc --noEmit` exit 0, `npm run test:engine` runs (64 engine tests).
- **Plan success criteria all met:**
  - [x] BattlePhase (9), BattleAction (5), BattleEvent (12), Side, MoveIndex, StatStages, BattleParticipant, BattleState exported from types.ts
  - [x] MoveLike.priority optional; Phase-1 damage tests still pass
  - [x] battleMachine.ts exports isLegal, reducer, BattleContext, ReducerOutput
  - [x] LEGAL_ACTIONS table verbatim from 02-RESEARCH §Pattern 1, enforced by `satisfies`
  - [x] Reducer throws `"Illegal action {action.type} in phase {state.phase}"` on illegal action
  - [x] step() switch covers all 9 BattlePhase cases with assertNever default; 8 phases throw "not implemented" sentinel, battleOver returns state
  - [x] package.json has `scripts.test:engine === "vitest run --project engine"` (was already present from Phase 1)
  - [x] All 5 type-contract tests + 45 isLegal cells + 3 reducer-throw tests pass
  - [x] No regressions: 118 prior tests still pass (171 total = 118 + 53 new)
  - [x] No react / Math.random / Date.now / new Date / src/data/** imports in new code
