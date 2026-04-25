# Phase 2: Battle Engine FSM - Context

**Gathered:** 2026-04-25
**Status:** Ready for research → planning

<domain>
## Phase Boundary

Phase 2 baut den **pure-TypeScript Battle-Reducer** der Engine — die Glue-Schicht
zwischen den Phase-1-Primitives (`damage`, `typeChart`, `accuracy`, `rng`) und dem
React-UI das in Phase 4 drauf gesetzt wird. **Kein React, keine Persistenz, keine
Items, kein Status, keine Evolutions, keine Routes** — nur:

1. **`engine/battleMachine.ts`** — 9-Phase FSM (`selecting → resolving → animatingPlayer
   → animatingEnemy → turnEnd → faintCheck → forceSwitch → enemyFaintReward → battleOver`)
   mit `isLegal(phase, action)` guard
2. **`engine/ai.ts`** — Wild-AI die einen legalen Random-Move wählt (AI-01)
3. **`engine/types.ts`** — Erweiterung um `BattleParticipant` (HP, status-stages-Skelett),
   `BattleState`, `BattleAction`, `BattleEvent`, `BattlePhase`-Union
4. **Reducer-Signatur** `(state, action, rng) → {state, events}` — pure function,
   gibt neue State + ordered event log zurück (Phase 4 UI replays for animations)
5. **Vitest-Szenario** das ein vollständiges Charmander-vs-Bulbasaur 1v1 unter
   fixed-seed RNG headlessly durchspielt und in `battleOver` mit deterministischem
   Outcome endet (ENG-06 success criterion #2)

**Nicht in Phase 2:**
- Items + X-Items + Pokéballs → Phase 6
- Status-Effects + Held-Items + Smart-AI → Phase 8
- Stat-Stages-LOGIC (apply/multiplier-table/X-Item moves) → Phase 6 (siehe D-20)
- React-Hooks / Context-Wiring → Phase 3-4
- Battle-UI / Animationen / HP-Bar / Move-Buttons → Phase 4
- Team-Management + party.length > 1 + forceSwitch-Path → Phase 5
- Evolution + Level-Up → Phase 4 (ENG-07)
- Route-Generator + Run-Loop → Phase 5

**ROADMAP-vs-REQUIREMENTS-Konflikt aufgelöst:** ROADMAP-Goal erwähnt "stat-stage system in Phase 2",
aber REQUIREMENTS-Tabelle mappt ENG-11 auf Phase 6. Wir bauen in Phase 2 nur das **Skelett**
(7 number fields pro Combatant, init 0), die Logik kommt Phase 6 (siehe D-20).

</domain>

<decisions>
## Implementation Decisions

### FSM + State-Shape

- **D-20: Stat-Stages-Skelett in BattleState ab Phase 2, Logik Phase 6.**
  `BattleParticipant` bekommt schon jetzt `statStages: { atk: 0, def: 0, spA: 0, spD: 0, spe: 0, acc: 0, eva: 0 }`
  (alle initial 0, Wertebereich -6..+6 dokumentiert per JSDoc). Apply-Funktion, Multiplier-Tabelle
  und X-Item-Moves bleiben Phase 6 (`engine/statStages.ts` wird dort gebaut).
  **Begründung:** Phase 4-UI kann den finalen BattleState-Shape lesen, Phase 6 fügt nur Logik dazu —
  kein UI-Refactor mit Save-Migration nötig.

- **D-21: BattlePhase-Union behält alle 9 Phasen ab Tag 1, Phase-2-Tests fahren nur Subset.**
  Union: `'selecting' | 'resolving' | 'animatingPlayer' | 'animatingEnemy' | 'turnEnd' | 'faintCheck' | 'forceSwitch' | 'enemyFaintReward' | 'battleOver'`.
  In Phase 2 (1v1, party.length === 1) entscheidet `faintCheck` direkt: `livingParty.length > 0 → forceSwitch`,
  sonst → `battleOver`. Phase-2-Tests treffen nur den `battleOver`-Pfad.
  Phase 5 wird `forceSwitch` aktivieren wenn Teams existieren — kein Union-Refactor nötig.

- **D-22: BattleAction-Union locked ab Phase 2, auch wenn manche Actions erst später fired werden.**
  `type BattleAction = { type: 'pickMove'; moveIndex: 0|1|2|3 } | { type: 'switchTo'; partyIndex: number } | { type: 'useItem'; ... } | { type: 'run' } | { type: 'continue' }`.
  `isLegal(phase, action)` Guard pro Phase. Phase 2 testet nur `pickMove` + `continue`. Phase 6 fired `useItem`. Phase 5 fired `switchTo`.

### Resolution-Order (Speed-Tie + Move-Priority)

- **D-23: Modern Smogon Resolution: priority → speed → RNG-Tiebreak.**
  `MoveLike` bekommt optional `priority?: number` (default 0; in Phase 2 alle Moves = 0; Phase 8 setzt Quick-Attack auf +1).
  Resolution in `resolving`-Phase:
  1. Höhere `move.priority` zuerst
  2. Bei Tie: höheres `combatant.speed` zuerst
  3. Bei Speed-Tie: `rng.chance(0.5)` entscheidet (deterministisch unter fixed seed)
  Modern Smogon-Konvention. Speed wird damit semantisch korrekt; Phase 8 + 11 brauchen das eh.

### Reducer-Output-Shape (Engine ↔ UI Contract)

- **D-24: Rich BattleEvent-Stream als Reducer-Output: `{state: BattleState, events: BattleEvent[]}`.**
  Pro reducer-Call wird neben dem neuen State eine **geordnete Liste atomarer Events** zurückgegeben.
  Beispiel-Sequenz für 1 Turn:
  ```
  ['turnStart', 'playerUsedMove:ember', 'critRolled', 'superEffective:2', 'damageDealt:34',
   'enemyHpChanged:48→14', 'enemyUsedMove:vine-whip', 'damageDealt:11', 'playerHpChanged:39→28',
   'turnEnd']
  ```
  `BattleEvent` ist eine discriminated union — typsicher, exhaustiv per `switch`.
  **Begründung:** Phase-4-UI iteriert die Events und triggert Animationen + Battle-Log-Strings in
  exakt der richtigen Reihenfolge. Engine bleibt pur (kein UI-Wissen), UI bleibt dumm
  (rekonstruiert nichts aus State-Diff).

### AI-API-Shape

- **D-25: Single-Entry-Point AI-API mit Strategy-Parameter ab Phase 2.**
  Signatur: `selectMove(state: BattleState, rng: Rng, strategy: 'random'): MoveIndex` in Phase 2.
  Phase 8 erweitert die Strategy-Union zu `'random' | 'gymPriority' | 'gymPrioritySwitch'` —
  kein API-Bruch, nur neue Strategy-Werte. Wild-Encounters in Phase 4+ konsumieren `'random'`,
  Gym-Leader in Phase 7+ konsumieren `'gymPriority'` und höher.
  **Begründung:** Konsumenten-API stabil halten; Strategy-Pattern ist die offensichtliche
  Erweiterungsachse.

### Engine-Discipline (vererbt von Phase 1, hier explizit re-bestätigt)

- **D-14 (vererbt):** Engine-Files unter `src/engine/**` dürfen weder `react`/`react-dom`
  importieren noch `Math.random` / `Date.now` / `new Date()` verwenden — ESLint-enforced.
  Battle-Reducer + AI sind keine Ausnahme.
- **`(state, action, rng) → {state, events}`-Signatur** ist die kanonische pure-function-Form
  für alle Engine-Reducer. Kein Side-Effect, kein I/O, kein Random ohne expliziten RNG.
- **Engine kennt keine Daten-Imports.** `engine/battleMachine.ts` darf NICHT aus `src/data/**`
  importieren. Caller (Test, später Context-Layer) reicht typeChart, moves, etc. als Parameter rein.
  Selbe Discipline wie typeChart-as-parameter aus Phase 1.

### Claude's Discretion

- **Internal state shape details** für `BattleState` jenseits der genannten Felder
  (Combatants, currentPhase, turnNumber, log-Counter). Researcher/Planner entscheidet
  exakte Property-Namen, Optional-Fields, etc.
- **`BattleEvent`-Discriminator-Naming** (`type: 'playerUsedMove'` vs `kind: ...`).
  Nur die Sequenz + Discriminated-Union-Garantie ist gelockt.
- **Vitest-Szenario-Details** — welcher seed, exakte HP-Final-Werte, Anzahl Turns
  bis battleOver. Planner schreibt das Szenario, Test ist deterministisch unter
  fixed-seed (kein Range-Assert).
- **Charmander vs Bulbasaur Move-Set** für den Test — die Daten kommen aus
  `src/data/pokemon-gen1.json`. Researcher/Planner wählt sinnvolle Defaults
  (Lvl 5, level-up-moves der jeweiligen Species).
- **Wo Reducer-Tests liegen** — `src/engine/__tests__/battleMachine.test.ts` plus
  Helper für Test-Fixtures-Aufbau ist die offensichtliche Wahl, aber Layout
  bleibt Planner überlassen.
- **`isLegal`-Guard-Implementation-Details** — Lookup-Table vs Switch-Case,
  egal solange exhaustiv über `BattlePhase × BattleAction`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before working.**

### Project Vision + Scope
- `.planning/PROJECT.md` — Vision, Constraints, Out of Scope, Key Decisions Table
- `.planning/REQUIREMENTS.md` §ENGINE — ENG-06 (FSM), ENG-09 (AI), Phase-2-relevant
- `.planning/ROADMAP.md` §"Phase 2: Battle Engine FSM" — Goal + 3 Success Criteria

### Prior Phase Context (load before starting)
- `.planning/phases/01-foundation-toolchain-engine-core/01-CONTEXT.md` — alle D-01..D-19 sind vererbt; insbesondere D-06..D-10 (engine mechanics), D-13 (Immer), D-14 (engine purity), D-15 (Vitest), D-18 (Split Context für später)
- `.planning/phases/01-foundation-toolchain-engine-core/01-02-SUMMARY.md` — was Phase 1 in `src/engine/` schon geliefert hat: `rng.ts` (mulberry32), `typeChart.ts` (`getTypeMultiplier`), `damage.ts` (`calculateDamage`), `accuracy.ts` (`rollAccuracy`, ACCURACY_FLOOR), `types.ts` (Combatant, MoveLike, GenOneType, TypeChart)

### Existing Engine API (Phase-2-Reducer wird darauf aufgebaut)
- `src/engine/rng.ts` — `createRng(seed)` → `{ next, nextInt, chance, counter }`
- `src/engine/typeChart.ts` — `getTypeMultiplier(moveType, defenderTypes, chart)` (chart-as-parameter, kein data-import)
- `src/engine/damage.ts` — `calculateDamage(ctx)` mit modern formula + D-07/D-08/D-09/D-10 locked
- `src/engine/accuracy.ts` — `rollAccuracy(moveAccuracy, rng)` mit 70% floor (D-09)
- `src/engine/types.ts` — `Combatant`, `MoveLike`, `GenOneType`, `TypeChart`, `DamageClass`

### External Domain References
- Bulbapedia — Gen-1 Move-Priority-Tabelle, Speed-Tie-Resolution, Faint-Sequenz
- Smogon — Modern resolution-order convention (priority → speed → tiebreak)
- React 19.2 — N/A für Phase 2 (kein React)
- Phase-1-Test-Patterns: `src/engine/__tests__/damage.test.ts` (it.each goldens), `src/engine/__tests__/golden-baseline.ts` (reference formula)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (Phase 1 Output)

`src/engine/` hat bereits 5 Dateien + `__tests__/`:
- `rng.ts` (mulberry32, seedable, counter-tracking) — **Battle-Reducer ruft `rng.chance()` für Crit + `rng.next()` für Random-Damage-Faktor + `rng.chance(0.5)` für Speed-Tie**
- `typeChart.ts` (`getTypeMultiplier`) — **Reducer ruft das in `resolving` für Type-Effectiveness, übergibt TypeChart aus `src/data/typeChart.json`**
- `damage.ts` (`calculateDamage`) — **Reducer baut DamageContext und ruft das in `resolving`**
- `accuracy.ts` (`rollAccuracy`) — **Reducer ruft das vor jedem Move in `resolving`; bei Miss: damage = 0, event = 'moveMissed'**
- `types.ts` (`Combatant`, `MoveLike`, `GenOneType`, `TypeChart`, `DamageClass`) — **Phase 2 erweitert um `BattleParticipant extends Combatant + hp + maxHp + statStages + ...`, `BattleState`, `BattleAction`, `BattleEvent`, `BattlePhase`**

### Established Patterns (von Phase 1 vererbt)

- **Pure-Engine-Layer:** Alle `src/engine/**`-Dateien sind pure TS, kein React, ESLint-enforced (D-14)
- **`(state, action, rng) → newState`-Signatur** als kanonische Reducer-Form (Phase-1-Specifics) — Phase 2 erweitert auf `(state, action, rng) → {state, events}` (D-24)
- **Chart-as-parameter:** typeChart wird vom Caller reingereicht, nie aus `src/data/` importiert (siehe `typeChart.ts` in Phase 1) — gleiche Discipline für Battle-Reducer
- **Vitest split:** Engine-Tests laufen in `engine`-Project (node-env), siehe `vitest.workspace.ts` (Phase 1 D-15)
- **Test-Pattern:** Phase 1 nutzt `it.each` für Goldens (`damage.test.ts`); Phase 2 wird Reducer-Sequenz-Tests + ein vollständiges Charmander-vs-Bulbasaur-Szenario brauchen
- **Reference-Formula als Mirror-Code:** `golden-baseline.ts` enthält die Bulbapedia-Formel byte-für-byte parallel zu `damage.ts` — Phase 2 könnte ein analoges `battle-baseline.ts` brauchen falls Reducer-Verhalten gegen externe Reference geprüft werden soll (Researcher entscheidet)

### Integration Points

- **`src/data/pokemon-gen1.json`** — Charmander/Bulbasaur Lvl-5 Base-Stats + Move-Pools für Test-Szenario
- **`src/data/moves-gen1.json`** — Ember, Vine Whip, Tackle, Growl etc. mit `power`, `type`, `damageClass`, `accuracy`
- **`src/data/typeChart.json`** — Modern-15-Type-Chart, wird vom Test als Parameter in Reducer reingereicht
- **`src/data/index.ts`** — Re-validiert beim Import (Phase 1 D-19); Test-File importiert von hier

### Was es NICHT gibt (typische Falle)

- **Keine `react` / `useState` / `useReducer` Hooks** — Phase 2 ist 100% pure TS. Phase 4 baut den `useImmerReducer` Wrapper.
- **Kein Battle-Context** — der kommt Phase 3 (`BattleContext` als Split aus D-18). Phase 2 reducer ist nur die zugrunde liegende pure function.
- **Kein localStorage** — kommt Phase 3.
- **Kein Mid-Battle-Save** — explizit ausgeschlossen per PERS-07.

</code_context>

<specifics>
## Specific Ideas

- **Test-Szenario "Charmander vs Bulbasaur 1v1":** Beide Lvl 5 mit ihren level-up-Moves. Fixed seed (Researcher wählt z.B. `0xC0FFEE`). Reducer wird in Schleife (`while phase !== 'battleOver'`) gefahren, asserts: (a) endet in `battleOver`, (b) deterministischer Winner unter fixed seed, (c) deterministische finale HP-Werte, (d) BattleEvent-Sequenz reproduzierbar.
- **AI-Determinismus-Test:** Identischer State + identischer RNG-Counter → identischer MoveIndex. Wichtig für Save-Resume-Use-Case in späteren Phasen.
- **`isLegal(phase, action)`-Coverage-Test:** Eine `it.each`-Tabelle die für jede der 9 Phasen × jede Action-Type die erwartete Legalität asserted.
- **BattleEvent-Vollständigkeits-Test:** Wenn Reducer von `selecting` → `battleOver` läuft, sollte die Event-Sequenz JEDEN State-Transition + JEDE damage/heal/faint-Aktion enthalten — keine "stillen" State-Mutationen.
- **Engine-Purity-Re-Check:** ESLint-Test aus Phase 1 (`tests/eslint-engine-purity.test.ts`) deckt automatisch ab dass Phase-2-Files keine React-Imports / Math.random haben — keine zusätzliche Vorkehrung nötig, aber Planner soll's im Plan erwähnen.

## Out of Scope (explicit)

Items die User möglicherweise erwarten könnte aber Phase 2 NICHT bringt:
- Status-Effects (Burn/Poison/Sleep) — Phase 8
- Held-Items + Item-Effekte — Phase 6 + 8
- Multi-Pokémon-Teams + tatsächlicher forceSwitch-Path — Phase 5
- Evolution-Decline-Prompt + Level-Up-Stat-Boosts — Phase 4 (ENG-07)
- Smart-AI (super-effective preference, switch on bad matchup) — Phase 8 (AI-02 + AI-03)
- Battle-UI (HP-Bar, Move-Buttons, Animationen, Battle-Log) — Phase 4
- Save/Resume — Phase 3 (Persistence) + PERS-07 (mid-battle restart)

</specifics>

<deferred_ideas>
## Deferred Ideas (für späteren Backlog)

(Keine während der Discussion entstanden — alle 4 Gray Areas wurden im Phase-Scope geklärt
ohne Scope-Creep-Vorschläge.)

</deferred_ideas>

## Next Steps

1. **`/gsd-plan-phase 2`** — Researcher recherchiert Reducer-Patterns, FSM-Implementation-Strategien,
   BattleEvent-Discriminated-Union-Best-Practices; Planner produziert PLAN.md(s) mit konkreten
   Tasks, must_haves, threat_model. Decisions D-20..D-25 gelten als gesetzt — wird nicht erneut
   abgefragt.
2. Nach Plan-Approval: **`/gsd-execute-phase 2`** — wahrscheinlich 2-3 Plans
   (FSM-Skelett + isLegal, Reducer-Logic mit damage-integration + AI, Charmander-vs-Bulbasaur-Szenario-Test)
3. **`/gsd-verify-work 2`** — UAT für Phase 2 ist klein (nur ein "headless test scenario passes"-Check),
   da kein UI rendert.
