---
phase: 02-battle-engine-fsm
verified: 2026-04-25T23:10:00Z
status: passed
score: 3/3 must-haves verified
overrides_applied: 0
gaps: []
deferred: []
human_verification: []
---

# Phase 2: Battle Engine FSM — Verification Report

**Phase Goal:** Die 9-Phase Battle-FSM, das Stat-Stage-Skelett und die Random-Wild-AI existieren als pure TypeScript-Module, sind unabhängig unit-getestet und können ein vollständiges 1v1 Battle headlessly durch den Reducer simulieren. Kein React — dieser Layer ist die reine Engine, auf die die UI in Phase 4 aufgesetzt wird.
**Verified:** 2026-04-25T23:10:00Z
**Status:** PASSED
**Re-verification:** Nein — Initial Verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `engine/battleMachine.ts` exposes a `BattlePhase` union and an `isLegal(phase, action)` guard covering all 9 phases | VERIFIED | `types.ts:95-104` definiert 9-Variant-Union; `battleMachine.ts:71-73` exportiert `isLegal`; 45 it.each-Zellen in `battleMachine.test.ts:180-186` covern jede Phase×Action-Kombination exhaustiv |
| 2 | Vitest-Szenario simuliert Charmander-vs-Bulbasaur 1v1 durch den Reducer und endet in `battleOver` mit deterministischem Outcome unter SEED=0xC0FFEE | VERIFIED | `battleMachine.test.ts:560-643` — 3 it-blocks: exact-value-lock (playerHp=16, enemyHp=0, turnNumber=3, rngCounter=11, eventCount=18, turnIterations=2, Histogram komplett), structural-invariant-lock, Determinismus-cross-check — 3/3 grün |
| 3 | `engine/ai.ts` selektiert via seedbarem RNG einen legalen Random-Move; gleicher Seed + State liefert immer denselben Move | VERIFIED | `ai.ts:15-36` — `selectMove(state, rng, 'random')`; Tests A2 (same-seed determinism), A4 (genau 1 RNG-Step pro Call), A4b (auch bei moves.length===1) — 7/7 grün |

**Score:** 3/3 Truths verified

---

### Required Artifacts

| Artifact | Erwartet | Status | Details |
|----------|----------|--------|---------|
| `src/engine/types.ts` | `BattlePhase`(9), `BattleAction`(5), `BattleEvent`(12), `BattleParticipant`, `BattleState`, `StatStages`, `Side`, `MoveIndex` exportiert | VERIFIED | 197 Zeilen; alle 8 Typen vorhanden; `MoveLike` additiv erweitert mit `priority?` + `accuracy?` + `name?` |
| `src/engine/battleMachine.ts` | `isLegal`, `reducer`, `BattleContext`, `ReducerOutput` exportiert; 9-Phase-FSM mit Auto-Advance und Event-Stream | VERIFIED | 392 Zeilen; vollständige Handler (`handleSelecting`, `handleResolving`, `handleTurnEnd`, `handleFaintCheck`); `LEGAL_ACTIONS` via `satisfies`-Guard; `assertNever`-Exhaustiveness |
| `src/engine/ai.ts` | `selectMove(state, rng, strategy)` mit Strategy-Pattern; genau 1 RNG-Step pro Call | VERIFIED | 36 Zeilen; D-25-konform; `AiStrategy = 'random'` union erweiterbar; `assertNever`-Default |
| `src/engine/battleResolution.ts` | `resolveOrder(...)` — Priority→Speed→RNG-Tiebreak; RNG NUR bei Speed-Tie konsumiert | VERIFIED | 31 Zeilen; D-23-konform; R1/R2/R4 beweisen counter-delta=0 ohne Tie; R3 beweist counter-delta=1 bei Tie |
| `src/engine/__tests__/battle-fixtures.ts` | `makeCharmander`, `makeBulbasaur`, `makeMove`, `makeFixtureChart`, `makeInitialBattleState` — kein `src/data/**`-Import | VERIFIED | 203 Zeilen; alle 5 Helpers exportiert; kein Data-Layer-Coupling; Dateiname kein `*.test.ts` |
| `src/engine/__tests__/battleMachine.test.ts` | 53 Plan-01-Tests + 6 M1-M6-Tests (Plan 02) + 3 Szenario-Tests (Plan 03) = 62 Tests total | VERIFIED | 644 Zeilen; 62 Tests laut Vitest-Output |
| `src/engine/__tests__/ai.test.ts` | 7 Tests A1-A6 incl. A4b | VERIFIED | 110 Zeilen; 7/7 grün |
| `src/engine/__tests__/battleResolution.test.ts` | 4 Tests R1-R4 | VERIFIED | 94 Zeilen; 4/4 grün |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `battleMachine.ts` | `damage.ts` | `calculateDamage(ctx)` in `handleResolving` | VERIFIED | `battleMachine.ts:281-287` — `calculateDamage({ attacker, defender, move, typeMultiplier, rng })` |
| `battleMachine.ts` | `accuracy.ts` | `rollAccuracy(move.accuracy ?? null, rng)` in `handleResolving` | VERIFIED | `battleMachine.ts:259` |
| `battleMachine.ts` | `typeChart.ts` | `getTypeMultiplier(move.type, defender.types, ctx.typeChart)` in `handleResolving` | VERIFIED | `battleMachine.ts:271-275`; TypeChart via `BattleContext` (chart-as-parameter per D-14) |
| `battleMachine.ts` | `battleResolution.ts` | `resolveOrder(playerMove, enemyMove, playerSpeed, enemySpeed, rng)` in `handleResolving` | VERIFIED | `battleMachine.ts:226-232` |
| `battleMachine.ts` | `ai.ts` | `selectMove(state, rng, 'random')` in `handleResolving` | VERIFIED | `battleMachine.ts:217` — AI-Pick als erster RNG-Step, vor resolveOrder |
| `reducer` | `step()` | Auto-Advance-Loop `while (isAutoPhase(next.phase))` | VERIFIED | `battleMachine.ts:112-121` — Stuck-Guard vorhanden |
| `handleFaintCheck` | `battleOver` | Direct `advance(state, 'battleOver')` bei hp===0 | VERIFIED | `battleMachine.ts:354-363` — kein forceSwitch in 1v1 Phase 2 |

---

### Data-Flow Trace (Level 4)

Nicht anwendbar — Phase 2 liefert ausschliesslich pure TypeScript-Engine-Funktionen ohne React, ohne UI-Rendering und ohne dynamischen Datenfluss aus externen Quellen. Alle Eingaben kommen als Parameter, alle Ausgaben sind immutable Return-Values. Der Szenario-Test verifiziert den vollständigen Datenfluss end-to-end (seed → Events → BattleState).

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 191 Tests passieren (alle 3 Plans) | `npm test` | 191 passed (13 files) in ~969ms | PASS |
| Charmander-vs-Bulbasaur-Szenario — 3 Locks | `npm run test:engine -- battleMachine.test.ts -t "Charmander vs Bulbasaur"` | 3/3 passing | PASS |
| AI-Tests — 7 Tests | `npm run test:engine -- ai.test.ts` | 7/7 passing | PASS |
| Resolution-Order-Tests — 4 Tests | `npm run test:engine -- battleResolution.test.ts` | 4/4 passing | PASS |
| Lint exit 0 | `npm run lint` (--max-warnings 0) | exit 0, keine Violations | PASS |
| TypeCheck exit 0 | `npx tsc --noEmit` | exit 0, keine Errors | PASS |
| Engine-Purity-Test (D-14) | `npm test -- eslint-engine-purity` | 6/6 grün (inkl. `react`-Import-Block) | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Beschreibung | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| ENG-06 | 02-01, 02-02, 02-03 | `engine/battleMachine.ts` — 9-Phase FSM mit `isLegal` Guard | SATISFIED | `battleMachine.ts:71-73` (isLegal); `types.ts:95-104` (BattlePhase union); 45 isLegal-Zellen + 6 Reducer-Logic-Tests + 3 Szenario-Tests grün |
| ENG-09 | 02-02 | `engine/ai.ts` — Random-Move-Selektion via seedbarer RNG | SATISFIED | `ai.ts:15-36`; A1-A6 (7 Tests) alle grün; 1 RNG-Step pro Call via A4/A4b bewiesen |
| AI-01 | 02-02 | Wild-AI wählt zufälligen legalen Move | SATISFIED | `selectMove(state, rng, 'random')` — deckungsgleich mit ENG-09; REQUIREMENTS.md `AI-01` korrekt auf Phase 2 gemappt |

---

### Locked Decisions Compliance

| Decision | Was locked | Status | Evidence |
|----------|------------|--------|----------|
| D-20 | `StatStages` Skelett mit 7 Feldern (atk/def/spA/spD/spe/acc/eva), alle init 0; Logik Phase 6 | HONORED | `types.ts:111-119`; Test 3 asserts alle 7 Felder default 0 |
| D-21 | `BattlePhase`-Union alle 9 Varianten ab Tag 1 | HONORED | `types.ts:95-104`; `LEGAL_ACTIONS` mit `satisfies Record<BattlePhase,...>`; Test 1 asserts length 9 + uniqueness |
| D-22 | `BattleAction`-Union 5 Varianten; `isLegal`-Guard ab Phase 2 | HONORED | `types.ts:162-167`; `battleMachine.ts:58-68`; 45 isLegal-Zellen; Test 2 asserts 5 Discriminatoren |
| D-23 | `resolveOrder`: Priority→Speed→RNG-Tiebreak; RNG NUR bei Speed-Tie | HONORED | `battleResolution.ts:21-31`; R1+R2+R4 counter-delta=0; R3 counter-delta=1 |
| D-24 | Reducer-Output `{state, events}`; `BattleEvent` Discriminated-Union; Event-Order dokumentiert | HONORED | `battleMachine.ts:84-87` (ReducerOutput); `types.ts:184-196` (12-Variant BattleEvent); M4 asserts order byte-for-byte; Szenario-Histogram beweist alle Event-Typen |
| D-25 | Single-Entry-Point AI-API mit Strategy-Pattern; `selectMove(state, rng, strategy)` | HONORED | `ai.ts:13-36`; A5 beweist `assertNever`-Default für unbekannte Strategien |
| D-14 (vererbt) | Engine-Purity: kein react/Math.random/Date.now/new Date/src/data/** in engine-Files | HONORED | `grep` findet nur Kommentar-Strings; ESLint-Engine-Purity-Test 6/6 grün; `npm run lint` exit 0 |

---

### Anti-Patterns Found

Keine Blocker oder Warnungen.

Stichprobenartige Checks auf alle neuen Dateien:

| Datei | Pattern-Check | Befund |
|-------|---------------|--------|
| `battleMachine.ts` | TODO/FIXME/placeholder/return null | Nur 2 bewusste `throw new Error('not implemented...')` für Phase-5/6-Deferred Paths (`forceSwitch`, `enemyFaintReward`) — kein Stub, sondern explizite Phase-Grenze |
| `ai.ts` | Math.random / stub-return | Keines; echter RNG-Call |
| `battleResolution.ts` | Hardcoded returns ohne Logik | Keines; alle 4 Branches korrekt |
| `battle-fixtures.ts` | src/data-Imports | Keines; handcrafted per A5 |
| `battleMachine.test.ts` | console.log / eslint-disable | Keines (Probe-Run-Instrumentation vollständig entfernt, per 02-03-SUMMARY bestätigt) |

Die `throw`-Zeilen für `forceSwitch` und `enemyFaintReward` sind keine Stubs — sie sind explizite Phase-Grenzen, die 1v1-Scope-Verletzungen laut debuggbar machen und in Phase 5/4 durch echte Handler ersetzt werden. Kein Blocker.

---

### Human Verification Required

Keine — Phase 2 hat kein UI, kein visuelles Verhalten, keine externen Services. Alle Behaviors sind über pure-function-Tests vollständig maschinell verifizierbar. Die VALIDATION.md bestätigt: "Alle Phase-2-Behaviors haben automatisierte Verifikation. Kein UAT-Visual-Check nötig."

---

### Phase-2 Test Breakdown

| Bereich | Tests | Quelle | Status |
|---------|------:|--------|--------|
| Phase-1 Regressions (rng/typeChart/damage/accuracy + UI + repo-shape + ESLint-purity) | 118 | Phase 1 | green |
| Plan 02-01: Typ-Contract + isLegal-Tabelle + Reducer-Throw-Smoke | 53 | `battleMachine.test.ts` | green |
| Plan 02-02: ai.test.ts (A1-A6 + A4b) | 7 | `ai.test.ts` | green |
| Plan 02-02: battleResolution.test.ts (R1-R4) | 4 | `battleResolution.test.ts` | green |
| Plan 02-02: battleMachine.test.ts M1-M6 | 6 | `battleMachine.test.ts` | green |
| Plan 02-03: Charmander-vs-Bulbasaur Szenario | 3 | `battleMachine.test.ts` | green |
| **Total** | **191** | | **green** |

---

### Gaps Summary

Keine Gaps. Alle drei Success Criteria des ROADMAP Phase 2 sind vollständig erfüllt, alle Locked Decisions D-20..D-25 (+ D-14) sind korrekt umgesetzt, alle 191 Tests sind grün, Lint und TypeCheck exitieren mit 0.

Phase 2 kann als abgeschlossen markiert werden. Phase 3 kann starten.

---

_Verified: 2026-04-25T23:10:00Z_
_Verifier: Claude (gsd-verifier)_
