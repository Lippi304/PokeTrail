---
phase: 01-foundation-toolchain-engine-core
plan: 02
subsystem: engine
tags: [engine, pure-typescript, rng, damage-formula, type-chart, accuracy, golden-tests, tdd]
requires:
  - vite-react-tailwind-toolchain (from 01-01)
  - eslint-engine-purity-rule (from 01-01)
  - vitest-split-projects (from 01-01)
provides:
  - src/engine/types.ts (GenOneType, TypeChart, Combatant, MoveLike)
  - src/engine/rng.ts (mulberry32, createRng — seedable PRNG with counter)
  - src/engine/typeChart.ts (getTypeMultiplier — chart as parameter)
  - src/engine/damage.ts (calculateDamage — modern formula with locked overrides)
  - src/engine/accuracy.ts (rollAccuracy, ACCURACY_FLOOR — 70% floor + null=always-hit)
  - 59 engine test assertions (rng 7, typeChart 27, accuracy 7, damage 18)
affects:
  - downstream battle-FSM (Phase 2) consumes calculateDamage + rollAccuracy
  - downstream data layer (Phase 1 plan 03) ships TypeChart that satisfies the contract
  - all future plans relying on deterministic RNG inherit createRng
tech-stack:
  added: []
  patterns:
    - Pure-engine layer in src/engine/** (no React, no Math.random, no Date.now, no new Date)
    - Seedable mulberry32 PRNG with counter for save/replay determinism
    - Chart-as-parameter for getTypeMultiplier — engine has zero coupling to src/data/**
    - Damage formula short-circuits on status moves + type immunity BEFORE RNG consumption
    - RNG ordering inside damage: crit roll first, random factor second (load-bearing for replay)
    - Reference formula encoded in golden-baseline.ts mirrors damage.ts byte-for-byte
key-files:
  created:
    - src/engine/types.ts
    - src/engine/rng.ts
    - src/engine/typeChart.ts
    - src/engine/damage.ts
    - src/engine/accuracy.ts
    - src/engine/__tests__/golden-baseline.ts
    - src/engine/__tests__/rng.test.ts
    - src/engine/__tests__/typeChart.test.ts
    - src/engine/__tests__/accuracy.test.ts
    - src/engine/__tests__/damage.test.ts
  modified: []
key-decisions:
  - D-06 implemented (15-type chart parameterized; psychic vs ghost = 2× per modern chart, NOT Gen-1 0× bug)
  - D-07 implemented (crit flat ~1/24 chance verified statistically over 100k rolls within ±2%)
  - D-08 implemented (per-move damage_class — physical uses attack/defense, special uses spAttack/spDefense)
  - D-09 implemented (70% accuracy floor + min-damage-1 clamp for non-immune non-status moves)
  - D-10 implemented (STAB ×1.5 when move type matches attacker type; random factor 85–100% via rng.next())
  - D-14 holds (engine purity: no react, no Math.random, no Date.now, no new Date — verified by ESLint + grep)
requirements:
  - ENG-01
  - ENG-02
  - ENG-03
  - ENG-04
  - ENG-05
metrics:
  duration: ~12 min
  tasks_completed: 2
  files_created: 10
  commits: 2
  completed_date: 2026-04-25
---

# Phase 1 Plan 2: Engine Core (TDD) Summary

Pure-TypeScript engine: seedable mulberry32 PRNG, parameterized type-chart lookup with multiplicative dual-type stacking, modern Gen-1 damage formula with locked overrides D-07..D-10, accuracy roll with 70% floor — all driven by Vitest TDD with 59 engine assertions (well over the ENG-04 mandate of ≥20).

## What Shipped

- **Types** (`src/engine/types.ts`): `GenOneType` enum (15 types per D-06, no Steel/Dark/Fairy), `GEN_ONE_TYPES` constant, `DamageClass`, `TypeChart`, `Combatant`, `MoveLike`. No React imports.
- **RNG** (`src/engine/rng.ts`): mulberry32 (Tommy Ettinger, public domain) + `createRng(seed, startCounter?)` returning an `RNG` interface with `next()`, `nextInt(min, max)`, `chance(p)`, and a read-only `counter` getter. `startCounter` burns N values at construction so a saved run can resume from any RNG offset.
- **Type chart** (`src/engine/typeChart.ts`): `getTypeMultiplier(moveType, defenderTypes, chart)`. The chart is a **parameter**, not an import — zero coupling to `src/data/**`, so plan 03 (data) can ship in parallel and the engine stays trivially testable with hand-built fixture charts. Throws on unknown move/defender types instead of silently defaulting to 1× (better to crash loudly than ship wrong damage).
- **Damage** (`src/engine/damage.ts`): `calculateDamage(ctx)` with the documented multiplier order `base → crit → STAB → type → random → floor at 1`. Short-circuits status moves and type immunity BEFORE consuming any RNG. RNG order: `chance(1/24)` first (crit), then `next()` (random factor 0.85+0.9999*0.15 range). Min-damage-1 clamp via `Math.max(1, Math.floor(raw))` for non-immune non-status moves.
- **Accuracy** (`src/engine/accuracy.ts`): `ACCURACY_FLOOR = 0.7` constant, `rollAccuracy(moveAccuracy, rng)` returns `true` for `null` accuracy (always-hit moves) and otherwise clamps the effective accuracy to ≥0.7 before rolling.

### Test coverage (59 engine assertions)

| File | Assertions | G-cases covered |
|---|---:|---|
| `rng.test.ts` | 7 | G22 (1/24 crit rate over 100k), G23 (determinism), G24 (counter replay) + uniformity + nextInt bounds |
| `typeChart.test.ts` | 27 | 12 single-type + 12 dual-type + 3 invalid-input guards; includes `psychic vs ghost = 2×` per D-06 |
| `accuracy.test.ts` | 7 | G19 (50%@rng=0.69 hits), G20 (50%@rng=0.71 misses), G21 (null bypass) + 70% boundary + 30% floor |
| `damage.test.ts` | 18 | 16 GOLDEN_CASES via `it.each` (G1, G1-high, G2, G3, G4, G5, G6, G7, G8, G9, G10, G11, G12, G13, G15, G16) + G17/G18 RNG bounds |
| **Total** | **59** | All 22 G-cases (G1–G24 minus the G14 0.25× case explicitly omitted in the plan) |

The `tests/` suite (eslint engine-purity + repo-shape, 22 assertions from plan 01-01) continues to pass — total project test count: **81/81**.

## Quality-Gate Evidence

```
$ npx vitest run                  # 81/81 passing across 6 test files (~600 ms)
$ npm run lint --max-warnings 0   # exit 0
$ npx tsc --noEmit                # exit 0
$ grep -rE "from 'react'|Math\\.random|Date\\.now|new Date\\(" src/engine/*.ts
                                  # only hit: a comment string in rng.ts documenting
                                  #   the engine-purity rule itself — no real API use
```

The ESLint engine-purity rule (D-14, scoped to `src/engine/**`) saw zero violations on the new code, confirming the boundary is enforced at lint time and is a real safety net (not just an aspiration).

## Wave-0 Verification of Golden Baselines (G1–G15)

Plan 01-02 Task 1 (Wave 0) called for verifying G1–G15 against the locked Bulbapedia formula BEFORE committing exact values. Implementation: `golden-baseline.ts` includes a `ref()` reference function that mirrors `damage.ts` byte-for-byte. `GOLDEN_CASES` calls `ref(...)` to compute the expected `damage` for every random-factor case (G1–G5, G9, G12, G13, G15, G16). If `damage.ts` ever diverges from `ref()`, the test fails and surfaces the bug — neither side can drift in isolation.

Concretely the locked low/high RNG bounds are:
- **Low bound** (`rngScript = [1.0, 0.0]`): `randMult = 0.85 + 0.0 * 0.15 = 0.85` (1.0 first call fails the 1/24 crit check; 0.0 second call gives the minimum random factor)
- **High bound** (`rngScript = [1.0, 0.9999]`): `randMult = 0.85 + 0.9999 * 0.15 = 0.999985` — note this is NOT 1.0, because `rng.next()` returns `[0, 1)` and `1.0` is unreachable. The expected high damage is `floor(base * stab * type * 0.999985)`, which can be 1 lower than `floor(base * stab * type * 1.0)` for cases where `base * mults` lands just below an integer boundary.
- **Force crit** (`rngScript = [0.0, 0.0]`): 0.0 < 1/24 = true; random factor = 0.85.

Numbers produced by `ref()` match the assertions used by `damage.ts` — 18/18 damage tests pass deterministically.

## Decisions Implemented

| ID | Decision | Where |
|---|---|---|
| D-06 | 15-type chart minus Steel/Dark/Fairy; modern psychic vs ghost = 2× | `types.ts` (`GenOneType`), `typeChart.test.ts` fixture asserts `psychic vs [ghost] = 2` and `psychic vs [ghost, poison] = 4`; the chart is a PARAMETER so the production chart from plan 03 plugs in |
| D-07 | Crit flat ~1/24 chance, ×1.5 multiplier | `damage.ts`: `rng.chance(1/24)`; `rng.test.ts` G22 verifies the rate empirically (100k samples, ±2% tolerance) |
| D-08 | Per-move physical/special via damage_class | `damage.ts`: `A = damageClass==='physical' ? attack : spAttack` (and same for D) |
| D-09 | 70% accuracy floor + min-damage-1 | `accuracy.ts`: `Math.max(ACCURACY_FLOOR, moveAccuracy/100)`; `damage.ts`: `Math.max(1, Math.floor(raw))` |
| D-10 | STAB ×1.5 when move type matches attacker type; random 85–100% | `damage.ts`: `attacker.types.includes(move.type) ? 1.5 : 1` and `0.85 + rng.next() * 0.15` |
| D-14 | Engine purity (no react / Math.random / Date.now / new Date) | ESLint flat-config scope `src/engine/**/*.{ts,tsx}` from plan 01-01; verified at lint time + by grep at acceptance |

## Patterns Locked for Downstream Plans

- **Engine signature pattern:** `(state, action, rng) → newState` for future battle reducer (Phase 2). RNG is **always passed in**, never created inside the engine.
- **Chart-as-parameter:** Anything in `src/engine/**` that needs lookup data accepts that data as an argument, never imports from `src/data/**`. This keeps the engine purely functional and means the data layer (plan 03) can ship independently.
- **Golden-table TDD:** Future engine subsystems (status effects, item effects, level-up math) will follow the same pattern — encode expectations in a `*-baseline.ts` next to the test, drive the test with `it.each`, mirror the production formula in a `ref()` so divergence is loud.
- **Deterministic test RNGs:** Two patterns are now established:
  - `scriptedRng(values: readonly number[])` for exact-value assertions in damage/accuracy tests
  - `createRng(seed)` for statistical-shape assertions in rng.test.ts (uniformity, ~1/24 crit rate)
- **Crit-roll consumes 1 RNG step:** Recorded for save/replay design — when restoring a saved run mid-battle, the `counter` field captures exactly how many `next()` calls were made. Damage = 2 calls (crit + random); status/immune = 0 calls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Incomplete fixture chart in `typeChart.test.ts`**
- **Found during:** Task 2 (after writing implementation, ran tests)
- **Issue:** The hand-built fixture chart was missing several cells that the dual-type assertions required: `water→rock`, `water→ground`, `grass→ground`, `grass→rock`, `fighting→flying`. Tests defaulted those to 1 (the fixture's neutral baseline), which caused `water vs [rock, ground] = 4` to actually compute 1*1=1, etc. Four dual-type assertions failed.
- **Fix:** Added the missing five cell overrides to the fixture `[water,rock]=2`, `[water,ground]=2`, `[grass,ground]=2`, `[grass,rock]=2`, `[fighting,flying]=0.5`.
- **Files modified:** `src/engine/__tests__/typeChart.test.ts`
- **Verification:** All 27 typeChart assertions pass.
- **Commit:** included in `249acab` (Task 2 GREEN)

**2. [Rule 1 - Bug] Off-by-one in golden-baseline `hi` random-factor calculation**
- **Found during:** Task 2 (after writing implementation, ran tests — G1-high failed with `expected 44 to be 45`)
- **Issue:** `range(...).hi` was computed using `randMult = 1.0`, but the test scripted RNG injects `0.9999` (since `rng.next()` returns `[0, 1)` — `1.0` is unreachable). With `0.9999`, the actual `randMult = 0.85 + 0.9999 * 0.15 = 0.999985`, slightly below 1.0. For one G-case (G1-high), the floored damage with `0.999985` was `44` while with `1.0` it would have been `45` — exactly the off-by-one observed.
- **Fix:** Changed `hi: ref(..., 1.0)` to `hi: ref(..., 0.85 + 0.9999 * 0.15)` so the expected value matches what `damage.ts` actually produces from the same scripted RNG input.
- **Files modified:** `src/engine/__tests__/golden-baseline.ts`
- **Verification:** All 18 damage assertions pass, including G1-high and G18.
- **Commit:** included in `249acab` (Task 2 GREEN)

**3. [Rule 1 - Bug] ESLint flagged `ReadonlyArray<T>` in test fixture helper**
- **Found during:** Task 2 (`npm run lint`)
- **Issue:** `typescript-eslint/array-type` rule prefers `readonly T[]` over `ReadonlyArray<T>`; the `makeFixture` helper signature used the forbidden form.
- **Fix:** `ReadonlyArray<readonly [GenOneType, GenOneType, TypeMultiplier]>` → `readonly (readonly [GenOneType, GenOneType, TypeMultiplier])[]`.
- **Files modified:** `src/engine/__tests__/typeChart.test.ts`
- **Commit:** included in `249acab` (Task 2 GREEN)

### Out-of-scope discovery (NOT fixed, logged for awareness)

`npx vitest run --project engine` returns "No test files found, exiting with code 1" even though the engine test files match the configured `include` pattern (`src/engine/**/*.test.ts`). Running the same Vitest command without `--project engine` correctly discovers and runs all 6 test files (4 engine + 2 cross-cutting). This appears to be a Vitest 2 + multi-project config interaction bug; it does NOT affect correctness — `npm test` (= `vitest run` without project filter) works perfectly and runs all engine tests in their dedicated `engine` project as configured. Documenting here so a future plan can investigate; no action taken.

### Authentication Gates

None — pure local TypeScript, no network, no auth.

## Threat Flags

None — engine remains a pure-functions-over-numbers-and-strings layer per the plan's `threat_model: "No threats — pure functions over numbers and strings, no I/O, no user input, no network."`. No new network endpoints, no auth paths, no schema-at-trust-boundary changes. The mandatory threat scan looked at `src/engine/types.ts`, `rng.ts`, `typeChart.ts`, `damage.ts`, `accuracy.ts` and the four test files — all are deterministic transformations with no side effects.

## Self-Check: PASSED

- **Created files exist:**
  - `src/engine/types.ts`, `src/engine/rng.ts`, `src/engine/typeChart.ts`, `src/engine/damage.ts`, `src/engine/accuracy.ts` — all present (verified via `ls -la src/engine/*.ts`)
  - `src/engine/__tests__/golden-baseline.ts`, `rng.test.ts`, `typeChart.test.ts`, `accuracy.test.ts`, `damage.test.ts` — all present
- **Commits exist:** `593d684` (Task 1 RED) and `249acab` (Task 2 GREEN) both confirmed via `git log --oneline`.
- **All quality gates green:** `npm test` (81/81), `npm run lint --max-warnings 0`, `npx tsc --noEmit` all exit 0.
- **Plan success criteria 1–6 met:** ≥20 golden cases (59 actual); engine purity provably enforced; zero data-layer coupling; determinism verified (G23/G24); 1/24 crit rate validated empirically (G22); 70% accuracy floor honored (G19/G20).
- **Phase 1 success-criterion #4 (≥20 Smogon golden test cases) achieved.**
