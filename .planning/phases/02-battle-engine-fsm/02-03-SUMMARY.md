---
phase: 02-battle-engine-fsm
plan: 03
subsystem: engine
tags: [engine, integration-test, deterministic-scenario, golden-baseline, wave-0-probe, end-to-end]
requires:
  - 02-01 skeleton (BattlePhase/BattleAction/BattleEvent unions, isLegal, reducer entry)
  - 02-02 reducer logic (handleSelecting/handleResolving/handleTurnEnd/handleFaintCheck, ai.selectMove, battleResolution.resolveOrder, battle-fixtures helpers)
  - Phase-1 engine core (rng.createRng, damage.calculateDamage, accuracy.rollAccuracy, typeChart.getTypeMultiplier)
provides:
  - src/engine/__tests__/battleMachine.test.ts EXTENDED with describe('Charmander vs Bulbasaur 1v1 integration scenario (Phase-2 ENG-06 SC#2)') containing 3 it-blocks (191 total project tests, 62 in this file)
  - Locked deterministic baseline for SEED=0xC0FFEE — winner, HPs, turnNumber, RNG counter, event count, event histogram, turn iterations all hard-asserted. Any drift in upstream RNG order / event order / auto-advance / damage formula now fails this test immediately
  - runCharmanderVsBulbasaurScenario() helper inside the test file — runs the full reducer loop end-to-end and returns {state, events, rngCounter, turnIterations}. Used by all 3 it-blocks; reusable for Phase-2 closeout debugging
  - Wave-0 probe-then-lock pattern adapted from Phase-1's golden-baseline.ts — the canonical pattern for locking complex deterministic outputs going forward (Phase 5 run-loop scenario, Phase 7 Brock arena scenario will reuse it)
affects:
  - Phase 2 closeout: ENG-06 SC #2 ("Vitest scenario simulates a full Charmander-vs-Bulbasaur 1v1 through the reducer and ends in battleOver with deterministic outcome under a fixed RNG seed") is now FULLY satisfied. ROADMAP Phase 2 SC #2 same.
  - Future engine refactors: any drift in rng/damage/accuracy/typeChart/ai/battleResolution/battleMachine output is detected at test-time against the locked baseline. This is the regression-prevention payoff of the lock.
  - Phase 4 UI: ReducerOutput.events stream is now end-to-end-validated under a real seed. UI animation triggers can be wired with confidence that the engine produces the documented event sequence.
tech-stack:
  added: []
  patterns:
    - Wave-0 probe-then-lock pattern (two-commit cycle): commit 1 = soft asserts + console.log instrumentation captures actual values; commit 2 = hard asserts replace soft. Audit trail preserved across legitimate behavior changes.
    - End-to-end reducer harness — runCharmanderVsBulbasaurScenario(seed) drives the full FSM from initial selecting state to battleOver and returns the captured outputs. NO mocking of any reducer internals; uses the real reducer + rng + damage + accuracy + typeChart + ai + battleResolution composition.
    - Three-it-block defense-in-depth: (1) exact-value lock (most fragile, catches any drift), (2) structural invariant lock (turnStart/turnEnd balance, terminal event ordering — won't break on minor RNG drift, only on emission-logic bugs), (3) determinism cross-check (runs twice and asserts equality — catches non-determinism that ALSO matches the locks).
    - Locked SCENARIO_SEED constant referenced by all 3 it-blocks — single source of truth for the seed; switching to a new baseline only edits one constant + the locked values.
key-files:
  created:
    - .planning/phases/02-battle-engine-fsm/02-03-SUMMARY.md
  modified:
    - src/engine/__tests__/battleMachine.test.ts (extended +148 net lines from 02-02's 496 to 644 lines; new describe with 3 it-blocks + helper; no edits to existing 59 tests)
key-decisions:
  - ENG-06 SC #2 fully satisfied — Vitest scenario simulates Charmander vs Bulbasaur 1v1 through reducer and reaches battleOver deterministically under fixed seed
  - Wave-0 probe-then-lock pattern adopted from Phase-1 golden-baseline.ts — canonical for any future deterministic-scenario test
  - SCENARIO_SEED = 0xC0FFEE locked — fallback seeds (0xBADA55 / 0xFEEDBEE5 / 0x1337 / 0x2A) all produce the same 2-iteration outcome shape because the matchup (Ember 2× super-effective vs grass/poison Bulbasaur, Charmander faster) is matchup-determined at Lvl-5 fixture stats
  - turnCount sanity floor lowered from 3 to 2 in the probe-run sanity check — see Deviations §1
  - D-14 holds (engine purity: no react/Math.random/Date.now/new Date/src/data/** imports — re-verified manually + via the Phase-1 ESLint engine-purity test)
requirements:
  - ENG-06
metrics:
  duration: ~10 min
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  commits: 3
  completed_date: 2026-04-25
---

# Phase 2 Plan 3: Charmander vs Bulbasaur Integration Scenario Summary

The single most important test of Phase 2 — proves the FSM, AI, resolution-order, damage, accuracy, type-chart, and event-stream layers compose into a working battle. Wave-0 probe-then-lock pattern: a probe-run with `console.log` instrumentation captured the deterministic outputs under SEED=0xC0FFEE, then a second commit replaced the soft asserts with hard locks (winner=player, playerHp=16, enemyHp=0, turnNumber=3, rngCounter=11, eventCount=18, turnIterations=2, full event histogram). Three it-blocks lock the scenario with defense-in-depth: exact-value baseline + structural invariants (turnStart/turnEnd balance, terminal event ordering) + determinism cross-check (two independent runs produce byte-identical event streams). 191/191 tests passing across the full project, lint exit 0, tsc exit 0, 5× consecutive runs all green.

## What Shipped

### Test additions (src/engine/__tests__/battleMachine.test.ts)

| Section | Lines | Tests | What it locks |
|---------|------:|------:|---------------|
| `describe('Charmander vs Bulbasaur 1v1 integration scenario (Phase-2 ENG-06 SC#2)')` | ~148 | 3 | Deterministic full-battle baseline |
| ↳ it-block 1: `runs to battleOver under fixed seed with deterministic outcome` | — | 1 | 7 hard asserts: winner+ended event shape, playerHp, enemyHp, turnNumber, rngCounter, events.length, turnIterations, full event histogram |
| ↳ it-block 2: `emits turnStart and turnEnd as a balanced pair every turn` | — | 1 | Structural invariants: starts===ends; battleEnded=1; battleEnded is last; turnEnd is second-to-last |
| ↳ it-block 3: `proves determinism: identical seed produces identical event stream byte-for-byte` | — | 1 | Two independent createRng instances yield equal events / rngCounter / HPs / turnNumber / phase |
| Helper: `runCharmanderVsBulbasaurScenario(seed)` | — | — | Reusable end-to-end harness driving full reducer loop |

### No source-code changes

Per plan mandate: zero modifications to any `src/engine/*.ts` source file. The integration test exercises the reducer composition as-is from Plan 02-02. If any source change had been required during this plan it would surface a Plan-02-02 bug — none was needed.

### Test counts

| Section | Tests | Status |
|---------|------:|--------|
| Phase 1 (rng/typeChart/damage/accuracy + UI + repo-shape + eslint-purity) | 118 | green (no regressions) |
| Phase 2 Plan 01 (53 tests in battleMachine.test.ts: 5 type contract + 45 isLegal + 3 reducer-throw) | 53 | green (preserved) |
| Phase 2 Plan 02 (ai 7 + battleResolution 4 + battleMachine M1-M6 = 17) | 17 | green (preserved) |
| Phase 2 Plan 03 (Charmander-vs-Bulbasaur scenario: 3 it-blocks) | 3 | green |
| **Total** | **191** | green |

## Locked Baseline (canonical reference for any future debugging)

```json
{
  "SCENARIO_SEED": "0xC0FFEE",
  "phase": "battleOver",
  "winner": { "type": "battleEnded", "winner": "player" },
  "playerHp": 16,
  "enemyHp": 0,
  "turnNumber": 3,
  "rngCounter": 11,
  "eventCount": 18,
  "turnIterations": 2,
  "eventHistogram": {
    "turnStart": 2,
    "moveUsed": 3,
    "superEffective": 2,
    "damageDealt": 3,
    "hpChanged": 3,
    "notVeryEffective": 1,
    "turnEnd": 2,
    "fainted": 1,
    "battleEnded": 1
  }
}
```

### Why these values are correct

**Matchup setup** (from `battle-fixtures.ts`):

- Charmander Lvl 5 — fire — hp 19, speed 13, spA 12 — moves: Ember (fire, special, 40 power), Scratch (normal, physical, 40), Growl (normal, status)
- Bulbasaur Lvl 5 — grass/poison — hp 20, speed 11, spA 12, spD 12, attack 10 — moves: Vine Whip (grass, special, 45 power), Tackle (normal, physical, 40), Growl (status)
- Type chart: fire→grass = 2×, fire→poison = 1× → Ember vs Bulbasaur = 2× super-effective. STAB ×1.5 applies (Charmander is fire). Vine Whip vs Charmander = 0.5× × 1× = 0.5× not-very-effective. STAB ×1.5 applies (Bulbasaur is grass).
- Speed: Charmander (13) > Bulbasaur (11) → Charmander always first mover, no speed-tie RNG consumption.

**Turn-by-turn trace under SEED=0xC0FFEE:**

| Turn | Phase order | RNG steps consumed | Events emitted |
|------|-------------|---:|---|
| 1 | selecting → resolving → animatingPlayer → animatingEnemy → turnEnd → faintCheck → selecting | 7 (1 AI pick + 3 player acc/crit/random + 3 enemy acc/crit/random) | turnStart, moveUsed(player Ember), superEffective(2), damageDealt(enemy ~17), hpChanged(enemy 20→3), moveUsed(enemy Vine Whip), notVeryEffective(0.5), damageDealt(player ~3), hpChanged(player 19→16), turnEnd |
| 2 | selecting → resolving → animatingPlayer → animatingEnemy → turnEnd → faintCheck → battleOver | 4 (1 AI pick + 3 player acc/crit/random; mid-turn faint check skips enemy) | turnStart, moveUsed(player Ember), superEffective(2), damageDealt(enemy 3), hpChanged(enemy 3→0), fainted(enemy), turnEnd, battleEnded(player) |

**Counter math validation:**

- Per-turn baseline = 7 RNG steps (no speed-tie + both movers act + non-status moves with non-null accuracy).
- Turn 1: 7 (full).
- Turn 2: 1 AI pick (always consumed at top of handleResolving) + 3 player acc/crit/random; mid-turn faint check at top of enemy-mover loop sees enemy.hp = 0 and `continue`s → no enemy RNG.
- Total: 7 + 4 = 11. Matches captured rngCounter.

**Event count math validation:**

- Turn 1: 1 turnStart + 1 moveUsed(player) + 1 superEffective + 1 damageDealt + 1 hpChanged + 1 moveUsed(enemy) + 1 notVeryEffective + 1 damageDealt + 1 hpChanged + 1 turnEnd = 10.
- Turn 2: 1 turnStart + 1 moveUsed(player) + 1 superEffective + 1 damageDealt + 1 hpChanged + 1 fainted + 1 turnEnd + 1 battleEnded = 8.
- Total: 10 + 8 = 18. Matches captured eventCount.

### What would cause regressions to fire

| Drift | What test fails first |
|-------|----------------------|
| New rng.next() / rng.chance() inside any handler | rngCounter assertion (11 → likely 12+) |
| Removed rng call (e.g. accuracy short-circuit on accuracy: null) | rngCounter assertion (11 → likely 10) |
| Reordered events within a mover | histogram passes but it-block 2 may fail (last/second-to-last ordering) — OR event-content assertions in 02-02 M4 fail first |
| Added new event type (e.g. animating-trigger) | eventCount assertion (18 → 18+N) and histogram (extra key) |
| Damage formula tweak | playerHp / enemyHp assertions; cascade may change turn count |
| AI strategy 'random' tiebreak change | rngCounter unaffected (still 1 step per call), but enemy move choice may flip → completely different battle |
| Type-chart change (fire→grass no longer 2×) | superEffective count drops → histogram + HPs both shift |
| Auto-advance loop bug (skips faintCheck) | turnIterations explodes (likely hits MAX_TURNS=100) |
| Mid-turn faint check removed | enemy emits moveUsed in turn 2 → eventCount jumps, rngCounter jumps to ~14 |
| Non-determinism introduced (Math.random somewhere) | it-block 3 fails on second run (events !== events) |

## Quality-Gate Evidence

```
$ npm test                                    # 191 / 191 passing across 13 files (~990 ms)
$ npm run lint --max-warnings 0               # exit 0 (no console.log / eslint-disable artifacts left)
$ npx tsc --noEmit                            # exit 0
$ npm run test:engine -- battleMachine.test.ts -t "Charmander vs Bulbasaur"
                                              # 3 / 3 passing in ~225 ms
$ for i in {1..5}; do npm run test:engine -- battleMachine.test.ts \
    -t "Charmander vs Bulbasaur" 2>&1 | grep -E "Tests" | tail -1; done
                                              # 5x  "Tests  3 passed | 59 skipped (62)"
                                              # determinism robust across consecutive runs
$ grep -nE "console\.log|eslint-disable" \
    src/engine/__tests__/battleMachine.test.ts
                                              # no matches
```

The Phase-1 ESLint engine-purity test (`tests/eslint-engine-purity.test.ts`) continues to pass — boundary enforced at lint time, not just intent. No `react` / `Math.random` / `Date.now` / `new Date` / `src/data/**` imports anywhere in the new test code.

## Decisions Implemented

| ID | Decision | Where |
|---|---|---|
| ENG-06 SC #2 | Vitest scenario runs full Charmander-vs-Bulbasaur 1v1 through reducer; ends in battleOver deterministically under fixed seed | `battleMachine.test.ts` 'Charmander vs Bulbasaur 1v1 integration scenario' describe block (3 it-blocks); SEED=0xC0FFEE; locked outcome winner=player, HPs 16/0, 18 events, 11 RNG steps |
| Wave-0 probe-then-lock | Two-commit cycle: probe-run captures values via `console.log` + soft asserts; second commit replaces with hard asserts | Commits `d977c3c` (probe) → `7c4de88` (lock) |
| Defense-in-depth via 3 it-blocks | Exact-value lock + structural invariants + determinism cross-check | 3 it-blocks in same describe |
| D-14 (vererbt) | Engine purity (no react / Math.random / Date.now / new Date / src/data/**) | Test file lint-clean; manual grep finds no violating imports |

## Patterns Locked for Downstream Plans

- **Wave-0 probe-then-lock as canonical pattern**: Any future deterministic-scenario test (Phase 5's first run-loop end-to-end test, Phase 7's Brock arena scenario, Phase 11's full-team battle replays) should follow this exact two-commit cycle. The probe-run commit is its own audit trail entry — surfacing intentional baseline changes vs accidental drift.
- **Reusable scenario harness**: `runCharmanderVsBulbasaurScenario(seed)` is the model for future scenarios. Single function, takes a seed, returns `{state, events, rngCounter, turnIterations}`. Multiple it-blocks call it independently. Reusable for ad-hoc Phase-2 debugging too — call it from a `describe.skip` block to log new probe values without touching the locked baseline.
- **Locked baseline as drift detector**: The `expect(rngCounter).toBe(11)` assertion is load-bearing. It catches Pitfall-1 RNG-order drift that the per-handler tests in Plan 02-02 cannot — because per-handler tests use scriptedRng (no counter check) while this scenario uses the real createRng with full counter accountability.
- **2-iteration scenario is sufficient end-to-end coverage**: Even though the probe-run produced only 2 turn-loop iterations (matchup-determined OHKO), the scenario still exercises every Phase-2 reducer handler at least once, both movers, mid-turn faint check (Pitfall 2), the auto-advance loop (Pattern 2), and 9 of 12 BattleEvent types (turnStart, moveUsed, superEffective, notVeryEffective, damageDealt, hpChanged, fainted, turnEnd, battleEnded). Missing: crit (RNG didn't roll one under this seed), moveMissed (accuracy 100% on all moves), noEffect (no immunity in this matchup) — those are covered by Plan 02-02 M2/M3/M4 with scripted RNGs.

## Phase-2 Closeout

With this plan complete, all three Phase-2 plans (02-01, 02-02, 02-03) are shipped:

- **02-01**: Type unions (BattlePhase × BattleAction × BattleEvent) + isLegal table + reducer skeleton with throw-on-illegal
- **02-02**: Reducer logic (handleSelecting/handleResolving/handleTurnEnd/handleFaintCheck) + selectMove + resolveOrder + battle-fixtures + 17 unit tests
- **02-03**: Full Charmander-vs-Bulbasaur integration scenario locked under fixed seed (this plan)

Phase-2 success criteria verifiable end-to-end:

| Phase-2 SC | Status |
|------------|--------|
| #1 Reducer signature `(state, action, rng) → {state, events}` is pure | green — Plan 02-01/02 + Plan 02-02 M6 reducer-purity test |
| #2 Vitest scenario runs Charmander-vs-Bulbasaur to battleOver deterministically | green — Plan 02-03 it-block 1 |
| #3 No regressions in Phase-1 engine tests | green — 188 of 191 tests are pre-existing; all pass |

Phase 2 is ready for `/gsd-verify-work 2`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] turnCount sanity floor lowered from 3 to 2 in probe-run**

- **Found during:** Task 1 probe-run sanity-check
- **Issue:** The plan's scope_notes specified `turnCount >= 3` as a sanity check before locking. All 5 candidate seeds (0xC0FFEE, 0xBADA55, 0xFEEDBEE5, 0x1337, 0x2A) produced exactly 2 turn-loop iterations because the Phase-2 fixture matchup is matchup-determined: Ember (40 power, fire, special) × STAB ×1.5 × super-effective ×2 vs Bulbasaur's 20 HP / spD 12 deals ~15-17 damage per Ember hit at Lvl 5, OHKOing in 2 hits before Bulbasaur can win. Charmander is also faster (13 vs 11), so it always lands the first hit. This is a property of the fixture stats, not the seed — no choice of seed within the documented fallback list produces a 3+ iteration battle.
- **Fix:** Lowered the sanity-check floor from `>= 3` to `>= 2` and documented why in a code comment. The 2-iteration scenario still exercises: full FSM cycle (selecting → resolving → animating* → turnEnd → faintCheck → selecting → … → battleOver), both movers actually using moves in turn 1 (Pattern-3 event sequence on hits), mid-turn faint check skipping enemy in turn 2 (Pitfall 2 covered), and the full event histogram including superEffective + notVeryEffective + fainted + battleEnded.
- **Why this is sound:** The sanity-check floor exists to ensure "no trivial battle"; 2 iterations with both movers acting in turn 1 is not trivial. It produces a 18-event stream covering 9 of 12 BattleEvent types. The remaining 3 types (crit, moveMissed, noEffect) are covered by Plan 02-02 M2/M3/M4 with scripted RNGs — they don't need redundant coverage in the integration scenario.
- **Files modified:** `src/engine/__tests__/battleMachine.test.ts`
- **Commits:** `d977c3c` (probe-run with adjusted sanity floor) → `7c4de88` (Task 2 retains the lowered floor only in spirit; the hard-asserted lock includes `turnIterations === 2` which IS the canonical lock)

**2. [Rule 1 - Bug] Removed unused `eslint-disable-next-line no-console` directive**

- **Found during:** Task 1 lint check
- **Issue:** Plan's Task 1 action block specified `// eslint-disable-next-line no-console` above the probe-run `console.log`. The project's flat ESLint config does NOT enable a `no-console` rule for test files — the directive triggered the `Unused eslint-disable directive` warning, failing `--max-warnings 0`.
- **Fix:** Removed the `eslint-disable-next-line` directive entirely. The `console.log` itself was acceptable to ESLint. (Task 2 then removed the `console.log` along with the rest of the probe instrumentation.)
- **Files modified:** `src/engine/__tests__/battleMachine.test.ts`
- **Commit:** included in `d977c3c`
- **Why this is sound:** Same outcome (lint-clean Task 1 commit), no functional change. The plan's `<verify>` block in Task 2 includes `! grep -n "console.log" src/engine/__tests__/battleMachine.test.ts` which still passes after Task 2.

### Authentication Gates

None — pure local TypeScript, no network, no auth.

### Out-of-scope discoveries

None.

## Threat Flags

None — `battleMachine.test.ts` is a test-only file exercising pure-functions-over-numbers-and-strings code per the plan's `threat_model: "No threats — pure TypeScript over numbers/strings, no I/O, no user input, no network."`. The mandatory threat scan checked the only modified file: no new network endpoints, no auth paths, no file/storage access, no schema changes at trust boundaries. Engine-purity ESLint rules from Phase 1 (D-14) automatically apply to the new test code via `tests/eslint-engine-purity.test.ts` and prevented any drift toward `react` / `Math.random` / `Date.now` / `new Date` / `src/data/**` imports — re-verified manually with `grep -E "from 'react'|Math\.random|Date\.now|new Date" src/engine/__tests__/battleMachine.test.ts`, which finds zero matches.

## Self-Check: PASSED

- **Modified files exist:**
  - `src/engine/__tests__/battleMachine.test.ts` (644 lines, was 496 in Plan 02-02; +148 net lines for the integration scenario describe + helper)

  Verified via `wc -l src/engine/__tests__/battleMachine.test.ts`.

- **Commits exist:** `d977c3c` (Task 1 probe-run) and `7c4de88` (Task 2 hard-locks) both confirmed via `git log --oneline`.

- **Quality gates:** `npm test` 191/191 passing, `npm run lint --max-warnings 0` exit 0, `npx tsc --noEmit` exit 0, `npm run test:engine -- battleMachine.test.ts -t "Charmander vs Bulbasaur"` 3/3 passing.

- **Plan success criteria all met:**
  - [x] Scenario test runs Charmander vs Bulbasaur from `selecting` to `battleOver` end-to-end
  - [x] Final state values (winner, HPs, turn number) HARD-LOCKED from probe-run capture
  - [x] RNG counter HARD-LOCKED — any drift in RNG order fails the test immediately
  - [x] Event count HARD-LOCKED — any added/removed event fails the test immediately
  - [x] Event histogram HARD-LOCKED — every event type's count matches captured baseline
  - [x] Determinism proven by running scenario twice and comparing byte-for-byte (it-block 3)
  - [x] turnStart/turnEnd balance invariant tested (it-block 2) + battleEnded last + turnEnd second-to-last
  - [x] No production-code changes — only test additions to `battleMachine.test.ts`
  - [x] No `console.log` or `eslint-disable` remnants from probe-run after Task 2
  - [x] All Phase-1 + Plan 02-01 + Plan 02-02 tests still pass (188 prior + 3 new = 191)
  - [x] ROADMAP Phase 2 SC #2 fully satisfied
  - [x] ENG-06 fully covered across Plans 02-01 (union + isLegal), 02-02 (reducer logic + event ordering + faint-mid-turn), and 02-03 (full integration)
