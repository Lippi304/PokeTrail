# Phase 2: Battle Engine FSM - Research

**Researched:** 2026-04-25
**Domain:** Pure-TypeScript Battle-Reducer / Finite-State-Machine / Diskriminated-Union-Events / Deterministische Reducer-Tests
**Confidence:** HIGH (FSM-Patterns + Reducer-Discipline sind in TS gut etabliert; alle relevanten Daten/Schemas in Phase 1 bereits gelockt)

## Summary

Phase 2 baut die kanonische pure-function Battle-Engine als deterministischen Reducer der Form `(state, action, rng) → {state, events}`. Die zentrale Designentscheidung ist eine **klassische FSM mit explizitem `phase`-Feld + `isLegal`-Guard + diskriminierten `BattleAction`/`BattleEvent`-Unions** — kein XState, kein Library-Buy-In (D-23 in Phase-1-CONTEXT lockt das bereits: "kein State-Machine-Lib"). Die 9 Phasen sind in der Mehrheit **Auto-Transitions** (`resolving → animatingPlayer → animatingEnemy → turnEnd → faintCheck → …`) — nur drei Phasen (`selecting`, `forceSwitch`, `battleOver`) warten auf User-Input. Alle Auto-Transitions werden vom Reducer rekursiv per Tail-Call abgewickelt während der Event-Stream weiter aufgebaut wird, sodass ein einziger `dispatch(pickMove)` einen kompletten Turn von Selection bis nächstem `selecting` (oder `battleOver`) als ein Reducer-Call ausführt und die UI dann den Event-Stream als Animation-Replay konsumiert.

Die größten Fallen sind: (1) RNG-Counter-Order — Crit/Damage/Accuracy/AI/Speed-Tie ziehen alle aus demselben RNG, die Reihenfolge ist load-bearing für Replay-Determinismus und muss dokumentiert sein wie schon `damage.ts` (Crit-vor-Damage). (2) Faint-Check-Ordering — wenn beide Pokémon im selben Turn fainten, entscheidet die Resolution-Order (priority/speed) wer zuerst „animiert" wird, aber der zweite Mover **darf nicht mehr ziehen** wenn der erste ihn ausgeknockt hat (Smogon-Konvention; Bulbapedia bestätigt). (3) BattleEvent-Granularität — eine zu grobe Aggregation (`turnExecuted`) erlaubt der UI keine korrekt sequenzierten Animationen, eine zu feine (`hpDecreased:1`, `hpDecreased:1`, …) bläht den Stream auf; richtige Granularität ist *eine Event-Linie pro UI-Animationsschritt*.

**Primary recommendation:** Implementiere `BattlePhase`/`BattleAction`/`BattleEvent` als drei diskriminiert-getaggte Unions, halte `isLegal` als `Record<BattlePhase, ReadonlySet<BattleAction['type']>>` (lookup-table, exhaustiv per `satisfies` über alle 9 Phasen), und mache den Reducer rekursiv über Auto-Transitions. Schreibe genau **einen** End-to-End-Charmander-vs-Bulbasaur-Test mit fixed seed der den vollen `events`-Stream + finale `state`-HPs deterministisch asserted, plus **mehrere kleine Unit-Tests** für `isLegal` (it.each-Tabelle), Resolution-Order (Speed-Tie, Priority-Override) und AI-Determinismus.

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Vererbt von Phase 1 (D-01..D-19)
- **D-06**: Modern 15-Type-Chart minus Steel/Dark/Fairy (psychic vs ghost = 2× modern, NICHT 0× Gen-1-Bug)
- **D-07**: Crit flat ~1/24, ×1.5 — bereits in `damage.ts` implementiert
- **D-08**: Per-Move physical/special via `damage_class` — bereits implementiert
- **D-09**: Accuracy-Floor 70% + Min-Damage 1 — bereits in `accuracy.ts` + `damage.ts`
- **D-10**: STAB ×1.5, Random-Faktor 85–100% — bereits implementiert
- **D-13**: Immer + use-immer + Zod ab Tag 1 — Reducer kann Immer `produce` nutzen, ABER Engine bleibt pur (D-14)
- **D-14 (engine purity, ESLint-enforced)**: Engine-Files dürfen nicht aus `react`/`react-dom` importieren, kein `Math.random`, kein `Date.now`, kein `new Date()`. **Gilt 1:1 für `battleMachine.ts` und `ai.ts`.**
- **D-15**: Vitest 2.x in workspace `engine` (node-env, fast). Phase-2-Tests landen unter `src/engine/__tests__/`.
- **D-18**: Split Context (Run + Battle) für später — nicht Phase 2, aber das `BattleState`-Shape das Phase 2 designt wird Phase 3-4 in `BattleContext` reingereicht.

#### Phase 2 spezifisch (D-20..D-25)
- **D-20**: `BattleParticipant` bekommt `statStages: { atk: 0, def: 0, spA: 0, spD: 0, spe: 0, acc: 0, eva: 0 }` als Skelett. Wertebereich -6..+6 in JSDoc. **Apply-Logik + Multiplier-Tabelle Phase 6**, in Phase 2 werden die Felder nur initialisiert und unverändert gelassen. (Forschung: Smogon Stat-Stages-Doku — Phase 6 wird `2/(2+x)` für negative und `(2+x)/2` für positive Stages bauen.)
- **D-21**: 9-Phase-Union komplett ab Tag 1. In Phase 2 testet der `battleOver`-Pfad (1v1, party.length=1, kein forceSwitch fired). Union-Werte exakt: `'selecting' | 'resolving' | 'animatingPlayer' | 'animatingEnemy' | 'turnEnd' | 'faintCheck' | 'forceSwitch' | 'enemyFaintReward' | 'battleOver'`.
- **D-22**: `BattleAction = pickMove | switchTo | useItem | run | continue` — locked. `isLegal(phase, action)` exhaustiv pro Phase. Phase 2 fired nur `pickMove` und `continue` aktiv.
- **D-23**: Modern Smogon Resolution: priority → speed → RNG-Tiebreak (`rng.chance(0.5)` deterministisch). MoveLike bekommt `priority?: number` (default 0). **Hinweis aus Code-Audit:** Das `Move`-Zod-Schema in `src/data/schemas.ts` hat bereits `priority: z.number().int()` — also nicht optional sondern required. Engine-`MoveLike` in `src/engine/types.ts` hat aktuell KEIN priority-Feld → Phase 2 muss es ergänzen (mit `?` für Backwards-Compat zu Phase-1-Tests, oder default-0 in der Mapper-Schicht zwischen `data/Move` und `engine/MoveLike`).
- **D-24**: Reducer-Output `{state: BattleState, events: BattleEvent[]}`. BattleEvent als diskriminierte Union, exhaustiv per `switch (e.type)`.
- **D-25**: `selectMove(state: BattleState, rng: Rng, strategy: 'random'): MoveIndex`. Strategy-Union erweiterbar in Phase 8 ohne API-Bruch.

### Claude's Discretion
- Internal `BattleState`-Shape jenseits der Pflichtfelder (turnNumber, log-Counter, etc.)
- BattleEvent-Discriminator-Naming (`type:` vs `kind:` — empfehle `type:` für Konsistenz mit BattleAction)
- Vitest-Szenario-Details (Seed, exakte HP-Werte, Anzahl Turns)
- Charmander-vs-Bulbasaur-Move-Set für den Test (Researcher empfiehlt unten konkrete Auswahl)
- Test-Datei-Layout (`battleMachine.test.ts` + `ai.test.ts` + Helper-Datei für Fixtures)
- `isLegal`-Implementation-Stil (Lookup-Table empfohlen, Switch-Case erlaubt)

### Deferred Ideas (OUT OF SCOPE)
*(Keine während Discussion entstanden — alle 4 Gray Areas wurden im Phase-Scope geklärt ohne Scope-Creep-Vorschläge. Dieses Feld bleibt leer.)*

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **ENG-06** | `engine/battleMachine.ts` implementiert 9-Phase-FSM (`selecting → … → battleOver`) mit `isLegal(phase, action)` Guard | §FSM-Pattern (lookup-table), §State-Shape, §Reducer-Architektur, §Resolution-Order (D-23), §Pitfalls (faint-ordering, infinite-loop) |
| **ENG-09** | `engine/ai.ts` wählt random legal moves; später für super-effective + switch erweitert | §AI-Pattern (Strategy + RNG-stream-share), §AI-Determinismus-Test |
| **AI-01** | Wild-Pokémon-AI selektiert Random Legal Move | §AI-Pattern (selectMove Signature D-25, RNG-Counter-Konsistenz) |

## Project Constraints (from CLAUDE.md)

Aus `./CLAUDE.md` (Projekt-Instructions) und User-Global-Instructions:

### Greift Phase 2 direkt
- **Tech stack**: Keine `any`-Types, alles strict typisiert (`strict: true` in tsconfig). → BattleAction/Event/Phase müssen alle exhaustiv typisiert sein, kein Fallback auf `any`.
- **Tech stack**: Vitest für Engine-Tests — Pflicht für Schadensformel, Typ-Tabelle, Level-Up, Item-Effekte. Battle-FSM ist Engine → Vitest-Tests Pflicht.
- **Code quality**: Komponenten max ~150 Zeilen pro Datei, Game-Logik strikt getrennt von UI. → `battleMachine.ts` wird mehr als 150 Zeilen brauchen (FSM + Reducer + Helpers); akzeptabel weil "Komponenten"-Limit für UI-Komponenten meint, nicht für Engine-Module. Trotzdem: strukturiere in `battleMachine.ts` (FSM-Reducer + isLegal) + `battleResolution.ts` (priority/speed/tiebreak) + `battleEvents.ts` (event factory helpers, optional) wenn das Hauptmodul zu groß wird.
- **Performance**: Keine Runtime-PokéAPI-Calls — Battle-Reducer importiert keine Daten, alles als Parameter (vererbtes Pattern: chart-as-parameter).

### Greift NICHT Phase 2 (UI-Constraints)
- React 19.2, Tailwind v4.2, `bg-[#0a0a0a]`, `100dvh`, ARIA — Phase 2 ist 100% pure TS, kein React.

### User-Global-Constraints (CLAUDE.md global)
- **Analyse vor Aktion**: Vor jedem Edit Datei vollständig lesen. — Planner muss `damage.ts`, `rng.ts`, `accuracy.ts`, `types.ts` komplett lesen bevor erweitert wird.
- **GSD-Workflow**: Planner ruft `/gsd-plan-phase 2` → Plans → `/gsd-execute-phase 2` → `/gsd-verify-work 2`.
- **Code-Qualität**: Nur ändern was geändert werden muss. → `types.ts` wird nur erweitert (BattleParticipant, BattleState, BattleAction, BattleEvent, BattlePhase), die existierenden 5 Interfaces bleiben unangetastet.

## Standard Stack

Phase 2 hat **null neue npm-Dependencies**. Alles was nötig ist liegt bereits aus Phase 1 vor.

### Core (alle bereits installiert per `package.json`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.7+ | Sprache mit strict diskriminierte Unions, exhaustive switch-checking | Im Projekt gepinnt; `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` machen FSM-Code maximal type-safe (siehe Pitfall „silenter index-undefined") |
| Vitest | ^2 | Test-Runner; teilt Vite's Transform-Pipeline | Engine-Tests laufen in `engine`-Workspace mit `environment: 'node'` (D-15) |

### Supporting (bereits installiert)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `immer` | ^10 | Immutable updates ohne Spread-Hölle | **Optional in Phase 2** — Reducer kann `produce` aus Immer nutzen, MUSS aber nicht. Kleinerer Code-Footprint mit Immer, aber engine-purity-Regeln (D-14) bleiben unberührt. Für deeply-nested HP/StatStages-Updates lohnt es sich. **Empfehlung: ja, mit Immer arbeiten** — `use-immer`s `useImmerReducer` kommt erst Phase 3-4 ins Spiel; Phase 2 nutzt `produce` direkt aus Immer (kein React-Hook). |
| Zod | ^3.23 | Schema validation | **NICHT für Phase 2** — Engine-Reducer nimmt nur typed in-memory Werte, kein I/O, keine localStorage. Zod kommt Phase 3 (Persistence) ins Spiel. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Klassische FSM (lookup table + switch) | **XState** | XState ist mächtig (parallel states, history, invocations), aber überdimensioniert für 9 Phasen mit linearen Auto-Transitions. Phase 1 hat bereits gelockt: "No state machine library — XState is wonderful for complex flows. The battle phase is `select \| animating \| result` — three states. Not worth the dependency." (`research/STACK.md`). +30KB, eigene API zu lernen, verstärkter Library-Lock-In. **Reject.** |
| Direkte Mutation in Reducer | Immer `produce` | Direct mutation in pure function geht (man returnt ein neues Objekt), aber bei tief verschachteltem `state.combatants.player.statStages.atk` wird Spread schnell unübersichtlich. Immer ist bereits in deps, kostet nichts extra. **Accept Immer.** |
| Single Reducer-Funktion | Sub-Reducers per Phase | Sub-Reducers (z.B. `selectingReducer`, `resolvingReducer`) sind sauber, aber für 9 Phasen mit zumeist Auto-Transitions wird der Top-Level-Reducer dann zur Orchestrierungs-Hülle und das Boilerplate steigt. **Empfehlung: ein Reducer mit `switch (phase)`-Top-Level + ausgelagerte pure Helpers (`resolveTurn`, `applyDamage`, `tieBreak`)**. |

**Installation:** keine — alles already installed.

**Version verification:**
```bash
npm view immer version       # confirms ^10 ist current
npm view typescript version  # confirms ^5.7 ist current
npm view vitest version      # confirms ^2 ist current
```
[VERIFIED: `package.json`] Alle Versionen aus Phase 1 schon im `package.json` gepinnt.

## Architecture Patterns

### Recommended Project Structure
```
src/engine/
├── battleMachine.ts        # FSM core: BattlePhase union + isLegal + reducer + transition logic
├── battleResolution.ts     # Speed/priority/tie-break helpers (Phase 2; or inline in battleMachine.ts)
├── ai.ts                   # selectMove(state, rng, strategy)
├── types.ts                # EXTEND: + BattleParticipant + BattleState + BattleAction + BattleEvent + BattlePhase
├── rng.ts                  # (unchanged from Phase 1)
├── typeChart.ts            # (unchanged)
├── damage.ts               # (unchanged) — consumed by battleMachine.ts
├── accuracy.ts             # (unchanged) — consumed by battleMachine.ts
└── __tests__/
    ├── battleMachine.test.ts   # isLegal it.each + state-transition unit-tests + Charmander-vs-Bulbasaur scenario
    ├── ai.test.ts              # selectMove determinism + legal-move enumeration
    ├── battleResolution.test.ts# priority/speed/tie-break (if extracted)
    └── battle-fixtures.ts      # makeCharmander(), makeBulbasaur(), makeFixtureChart() helpers
```

**Rationale für Aufteilung:**
- `battleMachine.ts` ist der Reducer + die Phasen-Definition. **Empfehlung: Reducer-Hauptdatei ≤ 300 Zeilen halten.** Wenn die Tendenz ist "1 Datei mit allem", die Helpers (priority-resolution, event-factories) auslagern.
- `ai.ts` separat damit Phase 8 die Strategy-Erweiterung dort lokalisiert hinzufügt — keine Änderung an `battleMachine.ts` nötig.
- `battle-fixtures.ts` als Test-Helper, KEIN `*.test.ts` damit Vitest sie nicht als Test-File picked.

### Pattern 1: Diskriminated-Union FSM mit Lookup-Table-Guard
**What:** `BattlePhase` als string-literal Union, `BattleAction` als diskriminierte Union, `isLegal` als statisches `Record<BattlePhase, ReadonlySet<BattleAction['type']>>`.
**When to use:** Wenn die FSM endlich, statisch, und in TS exhaustiv-checkable sein soll ohne externe Lib.
**Example:**
```typescript
// Source: TypeScript Handbook — Discriminated Unions + satisfies operator (TS 4.9+)
export type BattlePhase =
  | 'selecting'
  | 'resolving'
  | 'animatingPlayer'
  | 'animatingEnemy'
  | 'turnEnd'
  | 'faintCheck'
  | 'forceSwitch'
  | 'enemyFaintReward'
  | 'battleOver';

export type BattleAction =
  | { type: 'pickMove'; moveIndex: 0 | 1 | 2 | 3 }
  | { type: 'switchTo'; partyIndex: number }
  | { type: 'useItem'; itemId: string; targetPartyIndex?: number }
  | { type: 'run' }
  | { type: 'continue' };

type ActionType = BattleAction['type'];

// Lookup table — exhaustive per BattlePhase. `satisfies` enforces every key exists at compile time.
const LEGAL_ACTIONS = {
  selecting:         new Set<ActionType>(['pickMove', 'switchTo', 'useItem', 'run']),
  resolving:         new Set<ActionType>(['continue']),
  animatingPlayer:   new Set<ActionType>(['continue']),
  animatingEnemy:    new Set<ActionType>(['continue']),
  turnEnd:           new Set<ActionType>(['continue']),
  faintCheck:        new Set<ActionType>(['continue']),
  forceSwitch:       new Set<ActionType>(['switchTo']),
  enemyFaintReward:  new Set<ActionType>(['continue']),
  battleOver:        new Set<ActionType>([]),
} as const satisfies Record<BattlePhase, ReadonlySet<ActionType>>;

export function isLegal(phase: BattlePhase, action: BattleAction): boolean {
  return LEGAL_ACTIONS[phase].has(action.type);
}
```

**Begründung gegenüber Switch-Case:**
- `satisfies` zwingt jeden `BattlePhase` als Key — wenn jemand eine 10. Phase hinzufügt vergisst aber `LEGAL_ACTIONS` zu erweitern, **TS-Compile-Error**.
- O(1)-Lookup statt O(n) Switch — irrelevant performance-wise aber semantisch sauberer.
- Tabelle ist visuell als 9×5-Matrix lesbar, ein Switch-Case mit 9 Fällen × 5 Actions ist das ohne Übersicht zu liefern.

### Pattern 2: Auto-Transition-Reducer mit rekursivem Tail-Call
**What:** Phasen die keine User-Action erwarten (`resolving`, `animatingPlayer`, `animatingEnemy`, `turnEnd`, `faintCheck`, `enemyFaintReward`) werden vom Reducer automatisch durchlaufen wenn `'continue'` dispatched wird. Statt von außen 6× `dispatch({type:'continue'})` zu rufen, calldet der Reducer sich selbst rekursiv und akkumuliert Events.
**When to use:** Wenn die FSM viele Auto-Transitions hat und die UI nur die Animations-Sequenz braucht, nicht die Step-by-Step-Kontrolle.
**Example:**
```typescript
// Source: Adapted from Redux multi-step thunks + XState's "always" transitions
export function reducer(
  state: BattleState,
  action: BattleAction,
  rng: RNG,
  ctx: BattleContext, // typeChart, moves-by-id lookup
): { state: BattleState; events: BattleEvent[] } {
  if (!isLegal(state.phase, action)) {
    // Production decision: throw vs no-op vs return same state.
    // Recommendation: throw in dev, no-op in prod. For Phase 2: throw — caller bug.
    throw new Error(`Illegal action ${action.type} in phase ${state.phase}`);
  }

  const events: BattleEvent[] = [];
  let next = step(state, action, rng, ctx, events); // mutates `events`

  // Auto-advance through phases that don't need user input.
  while (isAutoPhase(next.phase) && next.phase !== state.phase) {
    next = step(next, { type: 'continue' }, rng, ctx, events);
  }

  return { state: next, events };
}

function isAutoPhase(phase: BattlePhase): boolean {
  return phase === 'resolving'
      || phase === 'animatingPlayer'
      || phase === 'animatingEnemy'
      || phase === 'turnEnd'
      || phase === 'faintCheck'
      || phase === 'enemyFaintReward';
}
```

**Vorteil:** UI dispatched einmal `pickMove`, bekommt zurück: `{state: phase==='selecting' for next turn, events: [turnStart, playerUsedMove, …, turnEnd]}` und animiert die Events sequenziell. Wenn `phase === 'forceSwitch'` rauskommt, weiß die UI: "halt, User-Choice nötig".

**Alternative (Caller-driven):** UI dispatched `pickMove`, bekommt `{phase: 'resolving', events: [turnStart]}` zurück, dispatched dann `continue`, bekommt `{phase: 'animatingPlayer', events: [...]}` etc. — das gibt der UI mehr Kontrolle (Pause-on-Animation), aber 6× mehr Reducer-Calls pro Turn. **Recommendation: rekursive Auto-Advance**, weil die UI die Events ohnehin in Animationszeit serialisiert und keine Phase-State-Sichtbarkeit braucht — sie braucht *Events*.

### Pattern 3: BattleEvent als Diskriminated Union — UI-Driven Granularity
**What:** Jeder Event ist eine getaggte Variant mit allen Daten die die UI für die Animation/Log-Zeile braucht. Naming-Schema: `<actor><Verb>` (camelCase) — `playerUsedMove`, `damageDealt`, `enemyFainted`, `crit`, `superEffective`, `notEffective`, `noEffect`, `moveMissed`, `turnStart`, `turnEnd`, `battleEnded`.
**When to use:** Wenn die UI Animations-Sequenzen aus dem Engine-Output ableiten muss ohne State-Diff zu rekonstruieren.
**Example:**
```typescript
// Source: Adapted from Pokémon Showdown server-event protocol + Redux toolkit `createAction` patterns
export type BattleEvent =
  | { type: 'turnStart'; turnNumber: number }
  | { type: 'moveSelected'; side: Side; moveIndex: 0 | 1 | 2 | 3 }
  | { type: 'moveUsed'; side: Side; moveName: string }
  | { type: 'moveMissed'; side: Side; moveName: string }
  | { type: 'crit'; side: Side }
  | { type: 'superEffective'; multiplier: number }       // 2 or 4
  | { type: 'notVeryEffective'; multiplier: number }     // 0.5 or 0.25
  | { type: 'noEffect' }                                  // multiplier === 0
  | { type: 'damageDealt'; side: Side; amount: number }   // damage TO `side`
  | { type: 'hpChanged'; side: Side; from: number; to: number; max: number }
  | { type: 'fainted'; side: Side }
  | { type: 'turnEnd'; turnNumber: number }
  | { type: 'battleEnded'; winner: Side };

export type Side = 'player' | 'enemy';
```

**Granularitäts-Regel:** Pro UI-Animationsschritt **ein** Event. „Player nutzt Ember, das ist super effective gegen Bulbasaur, kein Crit, macht 14 Damage" → 5 Events: `moveUsed`, `superEffective`, `damageDealt`, `hpChanged`, *(kein `crit`-Event weil nicht passiert)*. Die UI kann dann pro Event eine Battle-Log-Zeile + Animation triggern.

**WICHTIG:** Reihenfolge der Events ist Teil der API, nicht des UI-Mix-and-Match. Lock dokumentieren: `crit` (falls true) BEVOR `superEffective`/`notVeryEffective`, BEVOR `damageDealt`, BEVOR `hpChanged`. Das matched Bulbapedia-Battle-Log-Reihenfolge.

### Pattern 4: Resolution-Order via Pure Helper
**What:** Eine pure function `resolveOrder(playerMove, enemyMove, playerCombatant, enemyCombatant, rng): [first, second]` die D-23 (priority → speed → RNG-tiebreak) implementiert.
**When to use:** Innerhalb der `resolving`-Phase, **bevor** irgendein Damage gerollt wird.
**Example:**
```typescript
// D-23: priority → speed → RNG-tiebreak
type Order = ['player', 'enemy'] | ['enemy', 'player'];

export function resolveOrder(
  playerMove: MoveLike,
  enemyMove: MoveLike,
  playerSpeed: number,
  enemySpeed: number,
  rng: RNG,
): Order {
  const pPrio = playerMove.priority ?? 0;
  const ePrio = enemyMove.priority ?? 0;
  if (pPrio > ePrio) return ['player', 'enemy'];
  if (ePrio > pPrio) return ['enemy', 'player'];
  if (playerSpeed > enemySpeed) return ['player', 'enemy'];
  if (enemySpeed > playerSpeed) return ['enemy', 'player'];
  return rng.chance(0.5) ? ['player', 'enemy'] : ['enemy', 'player'];
}
```

**RNG-Konsumptions-Lock:** `rng.chance(0.5)` wird **nur bei Speed-Tie** gezogen. Tests müssen prüfen dass bei `playerSpeed !== enemySpeed` der RNG-Counter NICHT incrementiert wird (= keine RNG-Konsumption). Sonst gehen Replay-Counter durcheinander.

### Anti-Patterns to Avoid
- **Switch-Case auf `phase` ohne `assertNever(phase)`-Default:** TS prüft Exhaustivität nur wenn der Default-Branch `assertNever` calldet (oder das Switch eine `return` hat und kein implicit `undefined`). Sonst stillschweigender Bug bei neuer Phase-Variant.
- **`Math.random()` für Speed-Tie:** Bricht Replay-Determinismus. Auch ESLint blockt das (D-14).
- **Eine `Move`-Indirection-Tabelle inside `battleMachine.ts` importieren:** Engine kennt keine Daten-Imports. Caller (Test, Phase-3-Context) reicht ein `Move[]` (oder `Map<MoveId, Move>`) als Reducer-Parameter rein — selbe Discipline wie typeChart-as-parameter.
- **Aggregierter `turnExecuted`-Event:** UI kann nicht stückweise animieren. Lieber 8–12 atomare Events pro Turn.
- **`continue`-Action für `forceSwitch`:** Wenn der User sich entscheiden muss welcher Pokémon raus kommt ist `continue` (= "weiter, ohne Eingabe") falsch. Action für `forceSwitch` ist `switchTo` — `LEGAL_ACTIONS.forceSwitch === Set(['switchTo'])`.
- **Beide Pokémon ziehen lassen wenn der erste Mover den zweiten KO geschlagen hat:** Bug. Faint-Check muss zwischen den beiden Movern stehen, nicht erst am Turn-Ende. (Siehe Pitfall #2 unten.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Damage calculation | Eigene Formel im Reducer | `calculateDamage(ctx)` aus `damage.ts` | Bereits Phase 1 mit 18 Golden-Tests verifiziert. Reducer baut nur den DamageContext (passt rng, typeMultiplier rein) und konsumiert das Ergebnis. |
| Type-Effectiveness | Manuelle Multiplikation | `getTypeMultiplier(moveType, defenderTypes, chart)` | Bereits Phase 1, throws on unknown types. |
| Accuracy roll | Eigener `rng.next() < move.accuracy` | `rollAccuracy(moveAccuracy, rng)` | Bereits Phase 1 mit 70%-Floor (D-09). |
| RNG | `Math.random()` oder neuer PRNG | `rng.chance(p)`, `rng.next()`, `rng.nextInt(min,max)` aus `rng.ts` | ESLint blockt `Math.random` in `src/engine/**`. Counter-Tracking für Save/Replay. |
| FSM-Library | XState | Lookup-Table + diskriminierte Unions | 9 statische Phasen, lineare Auto-Transitions, kein Parallelism. Lib lohnt nicht. |
| Immutable updates | Spread-Hölle (`{...state, combatants: {...state.combatants, player: {...state.combatants.player, hp: ...}}}`) | Immer `produce` | Im Stack, +0 KB, dramatisch lesbarer. |
| Move-Lookup-Tabelle | Engine importiert `src/data/moves-gen1.json` | Reducer akzeptiert `Move[]` (oder `MoveId → Move` Map) als Parameter | D-14 + chart-as-parameter-Pattern aus Phase 1. |

**Key insight:** Phase 1 hat eine kleine, scharf umrissene Engine-Toolbox bereitgelegt (rng, damage, accuracy, typeChart). Phase 2 ist die **Komposition** dieser Tools zu einer kompletten Battle-Loop, NICHT die Reimplementierung. Wenn der Reducer auch nur eine Multiplikation für Damage selbst macht, ist das ein Bug — `calculateDamage` muss aufgerufen werden.

## Common Pitfalls

### Pitfall 1: RNG-Counter-Reihenfolge ist load-bearing für Replay
**What goes wrong:** Reducer-Call A zieht Crit-Roll *vor* Speed-Tie-Roll. Replay zieht es andersrum. Crit-Outcome vertauscht, Damage anders, finale HP anders, Test failt.
**Why it happens:** Bei mehreren RNG-Konsumenten in einem Turn (Speed-Tie? → Accuracy → Crit → Random-Faktor → AI-Move-Pick für nächsten Turn) muss die Reihenfolge **dokumentiert und gefixt** sein.
**How to avoid:** Lock dokumentieren in `battleMachine.ts` JSDoc:
```
RNG consumption order per turn (load-bearing for save/replay):
  1) rng.chance(0.5) — ONLY if speed tie (resolveOrder)
  2) For first mover:
       2a) rng.next() — accuracy roll (rollAccuracy)
       2b) rng.chance(1/24) — crit (inside calculateDamage, only if accuracy hit + non-status + non-immune)
       2c) rng.next() — random factor (inside calculateDamage, same conditions)
  3) For second mover (only if not fainted): same 2a-2c
  4) rng.next() — AI move pick for next turn's enemy (selectMove called once per `selecting` entry)
```
**Warning signs:** Test mit fixed seed produziert non-deterministische Outputs zwischen Runs auf verschiedenen Maschinen → fast immer RNG-Order-Drift.

### Pitfall 2: Faint-Check-Ordering — second mover darf nicht ziehen wenn KO durch first
**What goes wrong:** Player schlägt Enemy KO mit Move 1. Reducer lässt Enemy trotzdem noch ziehen ("turn-Symmetry"), Enemy macht Damage gegen ein bereits fainted Pokémon. Falsche HP/Events.
**Why it happens:** Naïve "first mover → second mover → faintCheck am Ende" Logik.
**How to avoid:** Inserted faint-check zwischen den zwei Movern:
```
resolving:
  → first.attack
  → faintCheck (intern, ohne UI-Phase) → if second fainted: skip second.attack, go to turnEnd
  → second.attack (only if not fainted)
  → turnEnd
  → faintCheck (UI phase) → forceSwitch | enemyFaintReward | battleOver | selecting (next turn)
```
Dieser Mid-Resolution-Check ist KEINE eigene FSM-Phase — er ist eine if-Bedingung *innerhalb* der `resolving → animating*`-Sequenz. Die `faintCheck`-FSM-Phase ist die **End-of-Turn**-Variante (nach status-tick, später Phase 8).
**Warning signs:** Charmander-vs-Bulbasaur-Test endet mit negativen HP-Werten oder mit einem Damage-Event nach `fainted`-Event in der Sequenz.

### Pitfall 3: Stille `phase`-Mutation ohne Event
**What goes wrong:** Reducer ändert `state.phase` aber emittet keinen Event darüber. UI blättert State-Diff nicht auf, Phase wechselt unsichtbar.
**Why it happens:** Vergessen, oder die Annahme "die UI guckt halt aufs phase-Feld".
**How to avoid:** **Pro `state.phase`-Übergang ein expliziter Event** in Phase 2 — entweder ein dediziertes `phaseEntered`-Event (overkill) oder das Auto-Phase-Konzept liefert ohnehin meaningful Events (`turnStart` markiert `selecting → resolving`, `damageDealt` markiert `resolving → animatingPlayer`, `turnEnd` markiert `turnEnd → faintCheck`, `battleEnded` markiert `→ battleOver`). Test: schreibe einen "no-silent-transition" Test der einen kompletten Turn fährt und asserted `events.length > 0`.
**Warning signs:** UI muss aufs `phase`-Feld pollen statt auf Events zu reagieren.

### Pitfall 4: Speed-Tie-RNG wird auch ohne Tie konsumiert
**What goes wrong:** Reducer ruft immer `rng.chance(0.5)`, auch wenn Speeds unterschiedlich sind. RNG-Counter wandert weiter, Saved-Replays nach Speed-Tie-Battles laufen anders.
**Why it happens:** Eager evaluation in Helper-Funktion.
**How to avoid:** RNG-Konsumption nur **innerhalb** des Tie-Branches:
```typescript
if (playerSpeed === enemySpeed) {
  return rng.chance(0.5) ? ['player', 'enemy'] : ['enemy', 'player'];
}
```
Test: zähle `rng.counter` vor und nach `resolveOrder()` mit ungleichen Speeds — muss identisch sein.
**Warning signs:** AI-Determinismus-Tests in Battles ohne Tie failen; replay-Diff in non-tie Battles zeigt Drift.

### Pitfall 5: Move PP-Tracking in Phase 2 (out of scope)
**What goes wrong:** Reducer assumes `move.pp > 0` Check, aber Phase 2 trackt PP gar nicht.
**Why it happens:** Übermotivation.
**How to avoid:** Phase 2 trackt **kein** PP. AI-`selectMove` enumeriert alle 4 Moves ohne PP-Filter. `move.pp = null` im MoveLike akzeptiert. Phase 6 (Items) oder Phase 8 wird PP einführen — dann erweitert sich `BattleParticipant` um `currentPP: number[]`.
**Warning signs:** Reducer hat `if (move.pp <= 0)` Branch ohne dass Phase 2 PP überhaupt schreibt.

### Pitfall 6: AI random-pick zieht falsche Anzahl RNG
**What goes wrong:** `selectMove(state, rng, 'random')` zieht 2 RNGs (eins für "shall I switch?", eins für "which move?"), aber Phase 2 hat keine Switch-Logik. Counter wandert um 2 statt 1, Replay drifted.
**Why it happens:** Vorwegnahme von Phase 8 Smart-AI.
**How to avoid:** Phase 2 `'random'` Strategy zieht **exakt einen** `rng.nextInt(0, legalMoves.length - 1)` Call. Keine Switch-Decision. Lock per Test: `selectMove(state, rng, 'random')` → counter delta == 1.
**Warning signs:** Replay-Tests laufen ein paar Turns korrekt, dann driften sie weil der AI-Counter doppelt zählt.

### Pitfall 7: `forceSwitch` Infinite-Loop mit allen Pokémon fainted
**What goes wrong:** Phase ist `forceSwitch`, aber alle Party-Pokémon sind fainted. Reducer versucht zu wechseln, findet niemand → Loop oder Crash.
**Why it happens:** Naïve `forceSwitch` Action akzeptiert nur `switchTo`, aber wenn Party leer ist gibt es keinen legalen `switchTo`.
**How to avoid:** **VOR** Übergang nach `forceSwitch`: prüfe `livingParty.length > 0`. Wenn `=== 0` → direkt `battleOver`. Phase 2 muss diese Verzweigung implementieren auch wenn nur der `battleOver`-Pfad getestet wird (weil party.length=1, KO=Battle-Over). Phase 5 wird den `forceSwitch`-Pfad fired.
**Warning signs:** Test endet in Endless-Loop oder wirft "no legal switchTo target".

### Pitfall 8: Engine-Purity-ESLint blockt erst beim Lint, nicht beim Test
**What goes wrong:** Reducer-Code nutzt `Date.now()` für ein Turn-Timestamp-Feature. Tests passen, aber ESLint failt im CI.
**Why it happens:** Vergessen dass `src/engine/**` keine wall-clock-Time hat.
**How to avoid:** Phase 2 hat **null** Timestamp-Felder im BattleState. Wenn UI später ein "Turn-Time" anzeigen will, lebt das im UI-Layer (außerhalb `src/engine/**`). Lint-Test (Phase 1's `tests/eslint-engine-purity.test.ts`) deckt das automatisch ab — Planner sollte es im Plan erwähnen damit Executor weiß: nicht versuchen `Date.now()` zu nutzen.
**Warning signs:** ESLint Error `Engine must not depend on wall-clock time.` — in dem Fall: Feature redesignen, nicht Lint-Regel disablen.

## Code Examples

### Reducer-Skelett (top-level switch + recursive auto-advance)
```typescript
// Source: Adapted from Redux Toolkit reducer pattern + XState's "always" transitions
import { produce } from 'immer';
import { calculateDamage } from './damage';
import { rollAccuracy } from './accuracy';
import { getTypeMultiplier } from './typeChart';
import { resolveOrder } from './battleResolution';
import type { RNG } from './rng';
import type { TypeChart, MoveLike } from './types';
import type { BattleState, BattleAction, BattleEvent, BattlePhase, Side } from './types';

export interface BattleContext {
  typeChart: TypeChart;
  // Future Phase 5+: moves: Map<MoveId, MoveLike>;
}

export function reducer(
  state: BattleState,
  action: BattleAction,
  rng: RNG,
  ctx: BattleContext,
): { state: BattleState; events: BattleEvent[] } {
  if (!isLegal(state.phase, action)) {
    throw new Error(`Illegal action ${action.type} in phase ${state.phase}`);
  }
  const events: BattleEvent[] = [];
  let next = step(state, action, rng, ctx, events);
  while (isAutoPhase(next.phase) && next.phase !== state.phase) {
    next = step(next, { type: 'continue' }, rng, ctx, events);
  }
  return { state: next, events };
}

function step(
  state: BattleState,
  action: BattleAction,
  rng: RNG,
  ctx: BattleContext,
  events: BattleEvent[], // mutated in-place
): BattleState {
  switch (state.phase) {
    case 'selecting':       return handleSelecting(state, action, rng, ctx, events);
    case 'resolving':       return handleResolving(state, rng, ctx, events);
    case 'animatingPlayer': return advance(state, 'animatingEnemy');
    case 'animatingEnemy':  return advance(state, 'turnEnd');
    case 'turnEnd':         return advance(state, 'faintCheck');
    case 'faintCheck':      return handleFaintCheck(state, events);
    case 'forceSwitch':     return handleForceSwitch(state, action, events);
    case 'enemyFaintReward':return advance(state, 'selecting');
    case 'battleOver':      return state; // terminal
    default: {
      const _exhaustive: never = state.phase;
      return _exhaustive;
    }
  }
}
```

### `selectMove` (D-25 Strategy-API)
```typescript
// Source: Strategy pattern — extensible without breaking API
import type { RNG } from './rng';
import type { BattleState } from './types';

type AiStrategy = 'random'; // Phase 8 extends: | 'gymPriority' | 'gymPrioritySwitch'

export function selectMove(
  state: BattleState,
  rng: RNG,
  strategy: AiStrategy,
): 0 | 1 | 2 | 3 {
  switch (strategy) {
    case 'random': {
      // Phase 2: no PP tracking, all 4 slots are legal as long as the Pokémon has a move there.
      const enemyMoves = state.combatants.enemy.moves; // length 1..4
      const idx = rng.nextInt(0, enemyMoves.length - 1);
      // Type assertion safe: enemyMoves.length <= 4
      return idx as 0 | 1 | 2 | 3;
    }
    default: {
      const _: never = strategy;
      return _;
    }
  }
}
```

**Test-Lock:** Bei `enemyMoves.length === 1` zieht `nextInt(0, 0)` weiterhin **1 RNG-Step** (laut `rng.ts` Implementation: `min + Math.floor(api.next() * 1) === min + 0 === 0`). Counter geht +1. Wichtig: AUCH bei trivial-only-one-move-Fällen wird der RNG advanced, sonst drifted Replay zwischen "1 Move" und "4 Moves" Battles.

### Charmander-vs-Bulbasaur Fixed-Seed Scenario (Skeleton)
```typescript
// Source: Adapted from Phase 1 damage.test.ts golden pattern
import { describe, it, expect } from 'vitest';
import { reducer } from '../battleMachine';
import { selectMove } from '../ai';
import { createRng } from '../rng';
import { makeCharmander, makeBulbasaur, makeFixtureChart, makeMove } from './battle-fixtures';

describe('Charmander vs Bulbasaur 1v1 (deterministic seed)', () => {
  it('runs to battleOver under fixed seed with deterministic events + final HPs', () => {
    const rng = createRng(0xC0FFEE);
    const ctx = { typeChart: makeFixtureChart() };
    let state = makeInitialBattleState({
      player: makeCharmander({ moves: [makeMove('ember'), makeMove('scratch'), makeMove('growl')] }),
      enemy:  makeBulbasaur({ moves: [makeMove('vine-whip'), makeMove('tackle'), makeMove('growl')] }),
    });
    const allEvents: BattleEvent[] = [];

    while (state.phase !== 'battleOver') {
      const action: BattleAction = state.phase === 'selecting'
        ? { type: 'pickMove', moveIndex: 0 } // player always picks first move
        : { type: 'continue' };
      // For enemy-driven phases the reducer internally calls selectMove(state, rng, 'random').
      const out = reducer(state, action, rng, ctx);
      state = out.state;
      allEvents.push(...out.events);
    }

    // Lock determinism (3-tier assertion):
    // (1) battleOver reached
    expect(state.phase).toBe('battleOver');
    // (2) winner is fixed
    const winnerEvent = allEvents.find((e) => e.type === 'battleEnded');
    expect(winnerEvent).toEqual({ type: 'battleEnded', winner: /* tbd: 'player' | 'enemy' */ });
    // (3) final HPs match exactly
    expect(state.combatants.player.hp).toBe(/* tbd */);
    expect(state.combatants.enemy.hp).toBe(/* tbd */);
    // (4) RNG counter matches (catches subtle ordering drift)
    expect(rng.counter).toBe(/* tbd */);
    // (5) Event count matches
    expect(allEvents).toHaveLength(/* tbd */);
  });
});
```

**Wave 0**: Lasse den Test einmal laufen mit den Werten als `expect.any(...)`-Platzhalter, log die tatsächlichen Werte, dann committe sie als Hard-Locks (das ist genau das Pattern aus Phase 1 `golden-baseline.ts`).

### `isLegal` Coverage-Test
```typescript
// it.each Coverage über alle 9 × 5 Kombinationen
import { describe, it, expect } from 'vitest';
import { isLegal, type BattlePhase, type BattleAction } from '../battleMachine';

const PHASES: BattlePhase[] = ['selecting','resolving','animatingPlayer','animatingEnemy','turnEnd','faintCheck','forceSwitch','enemyFaintReward','battleOver'];
const ACTIONS: BattleAction[] = [
  { type: 'pickMove', moveIndex: 0 },
  { type: 'switchTo', partyIndex: 0 },
  { type: 'useItem', itemId: 'potion' },
  { type: 'run' },
  { type: 'continue' },
];
const EXPECTED: Record<BattlePhase, ReadonlySet<BattleAction['type']>> = {
  selecting:        new Set(['pickMove','switchTo','useItem','run']),
  resolving:        new Set(['continue']),
  animatingPlayer:  new Set(['continue']),
  animatingEnemy:   new Set(['continue']),
  turnEnd:          new Set(['continue']),
  faintCheck:       new Set(['continue']),
  forceSwitch:      new Set(['switchTo']),
  enemyFaintReward: new Set(['continue']),
  battleOver:       new Set([]),
};

describe('isLegal exhaustive coverage (45 cells)', () => {
  it.each(
    PHASES.flatMap((phase) =>
      ACTIONS.map((action) => ({ phase, action, expected: EXPECTED[phase].has(action.type) }))
    )
  )('phase=$phase action=$action.type → $expected', ({ phase, action, expected }) => {
    expect(isLegal(phase, action)).toBe(expected);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class-based State Machines (`class BattleFSM { state; transition() }`) | Diskriminated-union + pure reducer | TS 4.x stable | Type-safe, kein `instanceof`, easy to serialize |
| Plain switch-case mit `default: throw` | `default: { const _: never = phase; return _; }` exhaustivity | TS 2.x | Compiler enforces every variant handled |
| `Record<K, V>` ohne `satisfies` | `... as const satisfies Record<K, V>` | TS 4.9 (Nov 2022) | Stricter literal types preserved + key-completeness check |
| Aggregierte Reducer-Outputs | Event-Stream-Reducer (Redux+RxJS-Style, oder Pokémon-Showdown protocol) | ~2018 onward | UI dekorrelliert von State-Diff |
| Battle-Engine-Dispatch ohne RNG-Param | RNG-as-parameter (functional core) | Pokémon Showdown reference impl | Replay-determinism |

**Deprecated/outdated:**
- **XState v4 actor-model nesting** für simple FSMs: nicht falsch aber overkill. v5 ist schlanker. **Nicht relevant** weil wir XState gar nicht nutzen.
- **`enum BattlePhase`**: TypeScript-Enums sind out of style — string-literal-Unions sind type-safer und tree-shake-able. Verwende `type BattlePhase = 'selecting' | ...`.
- **Returning `void` aus Reducer und mutating in-place ohne Immer**: alte Redux-Pre-Toolkit-Pattern; jetzt ist Immer Standard.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `MoveLike` braucht `priority?: number` (optional, default 0) ergänzt um D-23 zu unterstützen — `data/schemas.ts` hat bereits required `priority`, aber Engine `MoveLike` aktuell ohne | §Pattern 4, §State of the Art | Falls die Brücke `data/Move → engine/MoveLike` Phase 5+ kommt und Phase 2 nur engine-side-`MoveLike` erweitert, ist es safe. Falls Planner direkt `data/Move` als Engine-Input nutzt (Cross-Layer-Bruch), würde `priority` als required field nötig — Inkompatibilität wäre dann ein Type-Error im Test, nicht in Production. **User-Entscheidung in Plan-Phase.** [ASSUMED] |
| A2 | Phase 2 trackt **kein** PP — `selectMove('random')` enumeriert alle 4 Move-Slots ohne PP-Filter | §Pitfall 5 | Falls User PP-Tracking in Phase 2 will, wäre das ein Scope-Creep. CONTEXT.md sagt explizit: kein Items, kein Status, keine Teams — PP gehört in den gleichen "Phase 6 oder später" Block. [ASSUMED basierend auf "Nicht in Phase 2"-Liste in CONTEXT.md] |
| A3 | Reducer macht Auto-Advance rekursiv (ein `dispatch(pickMove)` läuft bis nächstem `selecting` oder `forceSwitch` durch) | §Pattern 2 | Falls die UI granulare Step-Kontrolle braucht (z.B. "User klickt 'continue' nach jeder Animation"), wäre Caller-driven die richtige Wahl. **Aber:** D-24 lockt explizit "Engine pur, UI replay-iteriert die Events" — das stützt Auto-Advance. Trotzdem ist die genaue Interaktions-Schnittstelle UI↔Reducer eine Phase-3/4-Frage; Phase 2 baut den Reducer und der UI-Layer entscheidet später. **Kein Risiko in Phase 2** weil der Reducer pure ist und beide Modelle unterstützt (UI kann Caller-driven anwenden indem sie `continue`-Actions einzeln dispatched). [ASSUMED — empfehle Auto-Advance als Default, aber documenten dass Caller-driven möglich ist] |
| A4 | `BattleEvent`-Reihenfolge `crit` → `superEffective`/`notVeryEffective`/`noEffect` → `damageDealt` → `hpChanged` matched gewünschte UI-Animation | §Pattern 3 | Falls UI eine andere Reihenfolge will (z.B. `damageDealt` zuerst weil Schaden-Zahl over Sprite einblendet), kann das in Phase 4 noch verschoben werden. Phase 2 lockt nur die *Existenz* der Events, nicht das exakte Reihenfolge-Interface. [ASSUMED] |
| A5 | Charmander/Bulbasaur Lvl-5 Stats und Move-Pools kommen aus `src/data/pokemon-gen1.json` und `moves-gen1.json` — diese Files **existieren noch nicht** (DATA-01..05 sind Pending) | §Code Example Charmander-vs-Bulbasaur | Falls die JSONs zum Zeitpunkt der Phase-2-Execution noch nicht existieren, MUSS der Planner entweder (a) Test-Fixtures handgepflegt in `battle-fixtures.ts` schreiben (entkoppelt von DATA-Phase), oder (b) DATA-01..05 als Phase-1-Restschuld vorziehen. **Empfehlung: (a) — Engine-Test ist ohnehin pure und braucht nur 2 fixture-Pokémon, kein 151er JSON.** [VERIFIED via `ls src/data/`: pokemon-gen1.json + moves-gen1.json existieren NICHT, nur schemas.ts + index.ts + leeres typeChart.json placeholder; siehe REQUIREMENTS-Status DATA-01..05 = Pending] |
| A6 | Reducer wirft (`throw`) bei illegalen Actions statt no-op zu returnen | §Pattern 2 | UI-Layer sollte never illegale Actions dispatchen weil sie das `phase`-Feld liest — Throw fängt Caller-Bugs früh. Falls User no-op wünscht ist das ein Plan-Phase-Detail. [ASSUMED — empfehle throw] |

## Open Questions

1. **Wo lebt die `Move`-Daten-Lookup (`MoveId → MoveLike`) in Phase 2?**
   - Was wir wissen: Engine darf nicht `src/data/**` importieren (D-14 + chart-as-parameter).
   - Was unklar ist: Reicht der Test in Phase 2 die Moves direkt im `BattleParticipant.moves: MoveLike[]` mit (also embedded statt referenced), oder braucht es eine `Map<MoveId, MoveLike>` als separater Reducer-Param?
   - Recommendation: **Embedded** — `BattleParticipant.moves: readonly MoveLike[]` (length 1..4). Phase 2 hat keine "lookup the move object by id" Use-Case (kein PP, keine forget-prompts). Phase 5 (Move-Learn) wird dann ggf. eine Mapper-Funktion `data/Move → engine/MoveLike` hinzufügen.

2. **Wie handelt `useItem` während `selecting` der Reducer in Phase 2?**
   - Was wir wissen: D-22 lockt `useItem` als legale Action in `selecting`.
   - Was unklar ist: Phase 2 implementiert keine Items. Wirft der Reducer `Error('items not implemented yet')` oder akzeptiert er die Action und no-op't?
   - Recommendation: **`isLegal('selecting', useItem) === true`** (sonst bricht D-22), aber `step()` für `useItem` in Phase 2 wirft `Error('useItem handled in Phase 6')`. Phase-2-Tests dispatchen `useItem` nicht. Ist semantisch sauber: Action-Set ist gelockt, Implementation incremental.

3. **Welcher fixed seed produziert ein "schönes" deterministisches Ergebnis (~5–8 Turns)?**
   - Was wir wissen: CONTEXT.md Specifics-Sektion suggested `0xC0FFEE`, aber das ist nur ein Vorschlag.
   - Was unklar ist: Bevor der Test geschrieben wird gibt es kein "richtiges" Seed — alles wird deterministisch.
   - Recommendation: **Wave 0 in Plan**: Probiere 3–5 Seeds, picke den der ein Battle in 5–8 Turns mit non-trivial Sequenz (mind. 1 Crit, mind. 1 Miss, mind. 1 super-effective Hit) produziert. Lock dann diesen Seed + alle Asserts.

4. **Soll der Reducer auch `events` für die Auto-Phase-Übergänge selbst emittieren (z.B. `phaseEntered:turnEnd`)?**
   - Was wir wissen: D-24 sagt "geordnete atomare Events"; Pitfall #3 sagt keine stillen State-Mutationen.
   - Was unklar ist: Reichen "Game-Events" (turnStart, moveUsed, damageDealt, hpChanged, fainted, battleEnded) aus, oder werden zusätzlich "FSM-Events" (phaseEntered) gebraucht?
   - Recommendation: **Game-Events only.** `turnStart`/`turnEnd`/`battleEnded` markieren die wichtigen Phasen-Übergänge implizit. UI braucht keine FSM-Internals. Spart Event-Volumen, reduziert API-Surface.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest, tsc | ✓ | 20 oder 22 LTS (per `engines` in package.json) | — |
| TypeScript | Compile + Test | ✓ | ^5.7 (devDep gepinnt) | — |
| Vitest | Engine-Tests | ✓ | ^2 (devDep gepinnt) | — |
| Immer | Reducer-Updates | ✓ | ^10 (dep gepinnt) | Optional — Spread-Updates möglich aber unleserlich |
| ESLint flat config | Engine-Purity-Lint | ✓ | ^9 + custom rule für `Math.random`/`Date.now` | — |
| `src/data/pokemon-gen1.json` | Charmander/Bulbasaur Stats für Test-Szenario | ✗ | — | **Kritisch:** Phase-2-Test schreibt eigene Fixture (`battle-fixtures.ts`) statt von data-JSONs zu lesen. Engine ist ohnehin daten-agnostisch. |
| `src/data/moves-gen1.json` | Ember/Vine-Whip Move-Stats für Test-Szenario | ✗ | — | Wie oben — Fixture-Helper macht 4 Moves manuell. |
| `src/data/typeChart.json` | TypeChart-Param für Reducer-Test | ✗ (file existiert leer) | — | Test nutzt `makeFixtureChart()` Helper (siehe Phase 1 typeChart-Test-Pattern). |

**Missing dependencies with no fallback:** Keine.

**Missing dependencies with fallback:** Drei `src/data/*.json`-Files sind als DATA-01..05 Phase 1 noch pending. **Phase 2 ist davon entkoppelt** — Engine-Test schreibt seine eigenen Fixtures. Lock in Plan: **NICHT auf DATA-01..05 warten**, NICHT versuchen die JSONs zu importieren. Test-Fixtures stay handcrafted.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vitest.workspace.ts` (workspace `engine`, env `node`) |
| Quick run command | `npm run test:engine` |
| Full suite command | `npm test` (alle 81+ existierende Tests + neue Phase-2-Tests) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENG-06 | `BattlePhase`-Union komplett mit allen 9 Werten exportiert | unit (TS-Compile + runtime check) | `npx tsc --noEmit && npm run test:engine -- battleMachine.test.ts -t "BattlePhase union"` | ❌ Wave 0 — `src/engine/__tests__/battleMachine.test.ts` |
| ENG-06 | `isLegal(phase, action)` exhaustiv über alle 9×5 Phase×Action-Kombinationen | unit (it.each table) | `npm run test:engine -- battleMachine.test.ts -t "isLegal"` | ❌ Wave 0 |
| ENG-06 | Reducer transitioniert `selecting → resolving → animatingPlayer → animatingEnemy → turnEnd → faintCheck → battleOver` deterministisch unter fixed seed | integration (full Charmander-vs-Bulbasaur 1v1 scenario) | `npm run test:engine -- battleMachine.test.ts -t "Charmander vs Bulbasaur"` | ❌ Wave 0 |
| ENG-06 | Mid-resolution faint check verhindert second mover bei first-mover-KO | unit (scripted RNG, OHKO-szenario) | `npm run test:engine -- battleMachine.test.ts -t "faint mid-turn"` | ❌ Wave 0 |
| ENG-06 | Resolution-Order: priority > speed > rng-tiebreak; RNG nur bei Speed-Tie konsumiert | unit (3 cases × counter-Assertion) | `npm run test:engine -- battleResolution.test.ts` (oder inline in battleMachine.test) | ❌ Wave 0 |
| ENG-06 | `BattleEvent`-Stream emittet `turnStart`, `moveUsed`, `damageDealt`, `hpChanged`, `turnEnd`, `battleEnded` in geforderter Reihenfolge | integration (event-sequence assertion in scenario) | `npm run test:engine -- battleMachine.test.ts -t "event sequence"` | ❌ Wave 0 |
| ENG-09 | `selectMove(state, rng, 'random')` returns `0..3` aus legal moves | unit | `npm run test:engine -- ai.test.ts -t "random returns legal index"` | ❌ Wave 0 — `src/engine/__tests__/ai.test.ts` |
| ENG-09 | `selectMove` ist deterministisch unter identischem state + identischem RNG-Counter | unit (zwei Calls mit gleichem seed → gleicher Index) | `npm run test:engine -- ai.test.ts -t "deterministic"` | ❌ Wave 0 |
| ENG-09 | `selectMove` zieht **genau einen** RNG-Step pro Call | unit (counter delta == 1) | `npm run test:engine -- ai.test.ts -t "rng counter"` | ❌ Wave 0 |
| AI-01 | Wild-AI wählt random legal move (= ENG-09 für `'random'`-Strategy) | unit (existing tests cover this) | siehe ENG-09-Tests | ❌ Wave 0 |
| Engine-purity (D-14, vererbt) | `battleMachine.ts` + `ai.ts` enthalten kein `react`/`Math.random`/`Date.now`/`new Date` | lint (auto via ESLint flat config + `tests/eslint-engine-purity.test.ts` aus Phase 1) | `npm run lint && npm test -- eslint-engine-purity` | ✅ existing — Phase 1 lint test scant `src/engine/**` rekursiv, neue Files automatisch covered |
| Engine-purity (D-14) | Keine Daten-Imports aus `src/data/**` in `battleMachine.ts` oder `ai.ts` | grep + manual review | `! grep -r "from '\\.\\./data" src/engine/battleMachine.ts src/engine/ai.ts` | ✅ implicit — bei Lint-Time greift `no-restricted-imports`, Plan kann zusätzlich grep-Test schreiben |

### Sampling Rate
- **Per task commit:** `npm run test:engine` (~ <1s wenn nur engine-Subset, wegen node-env)
- **Per wave merge:** `npm test` (alle Workspaces, ~600ms aktuell + Phase-2-Adds, sollte <2s bleiben)
- **Phase gate:** `npm test && npm run lint --max-warnings 0 && npm run typecheck` alle exit 0 vor `/gsd-verify-work 2`

### Wave 0 Gaps
- [ ] `src/engine/__tests__/battleMachine.test.ts` — covers ENG-06 (alle Branches: union, isLegal, reducer-step, scenario, mid-faint, event-stream)
- [ ] `src/engine/__tests__/ai.test.ts` — covers ENG-09 + AI-01
- [ ] `src/engine/__tests__/battleResolution.test.ts` — covers Resolution-Order (kann auch in battleMachine.test.ts inline bleiben wenn Datei ≤ 300 Zeilen)
- [ ] `src/engine/__tests__/battle-fixtures.ts` — Test-Helper (`makeCharmander`, `makeBulbasaur`, `makeMove`, `makeFixtureChart`, `makeInitialBattleState`); KEIN `*.test.ts`, sonst pickt Vitest die Datei als Test
- [ ] **Wave-0-Step in Plan**: Run Test einmal mit `expect.any(...)`-Platzhaltern, log Outputs (winner, finale HPs, RNG-counter, event-count), commit als Hard-Locks (Phase-1-`golden-baseline.ts`-Pattern adaptiert)

### Nyquist 2× Coverage Argument
ENG-06 ist die FSM-Korrektheit. Nyquist-Stil: jeden FSM-Übergang **doppelt** abdecken — einmal als isolierter Unit-Test (`isLegal`-Tabelle, individual reducer-step) und einmal als Integration im End-to-End-Szenario. Das catched zwei Klassen Regression: (a) "ich habe `isLegal` korrekt gemacht aber `step()` ist falsch" — fängt nur das Szenario; (b) "Szenario läuft happy-path durch aber `forceSwitch` ist subtle broken" — fängt nur die `isLegal`-Tabelle. Beide Test-Lager nötig.

## Security Domain

`security_enforcement` ist im `.planning/config.json` nicht explizit gesetzt — Default = enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nein | Kein Auth in v1 (PROJECT.md: kein Backend, kein Auth) |
| V3 Session Management | nein | Kein Session-State |
| V4 Access Control | nein | Single-User-Client-App |
| V5 Input Validation | **teilweise** | Reducer akzeptiert nur typisierte `BattleAction`s; UI-Layer wird Phase 3+ Action-Konstruktoren ausschließlich aus User-Input ableiten. Phase 2 selbst hat **null externe Inputs** (keine Network-Calls, kein Storage-Read, kein User-String) — Reducer ist transformation-pure. **Defense:** Type-System + diskriminierte Unions. Kein Zod nötig in Engine-Layer (Zod kommt am Storage-Boundary in Phase 3). |
| V6 Cryptography | nein | Kein Crypto in v1 |

### Known Threat Patterns for {Pure-TS Game Engine}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Replay-Drift via Math.random Fallback | Tampering (data-integrity, save/replay) | ESLint-Rule `no-Math-random` in `src/engine/**` (D-14, Phase-1-locked) |
| Replay-Drift via wall-clock-Time-Coupling | Tampering | ESLint-Rule `no-Date.now`/`no-new-Date` (D-14) |
| Engine importiert UI-State und leakt UI-Concerns in Save-Format | Tampering, Repudiation (Save-Format-Korruption) | ESLint-Rule `no-restricted-imports` blockt `react`/`react-dom` (D-14, FOUND-05) |
| Illegal Action via deeply-nested call destabilisiert State | Tampering | `isLegal`-Guard im Reducer-Entry, `throw` auf Verletzung — fail-fast statt silent-corrupt |
| AI-RNG kontaminiert Damage-RNG (selbe Stream) | Tampering, Replay-Drift | Phase 2 nutzt **einen** RNG-Stream, aber dokumentierte Konsumptions-Reihenfolge. Tests prüfen Counter-Delta. (Alternative: separate sub-streams via separate `createRng(seed_ai)` — wäre overkill für v1, aber valide Phase-8-Verbesserung wenn AI-Strategy-Komplexität wächst.) |

**Engine-spezifische Threat-Modell-Aussage:** Phase 2 ist `pure functions over numbers and strings, no I/O, no user input, no network` — wortlich aus Phase-1-`01-02-SUMMARY.md` für die Engine-Core-Plan. Selbe Aussage gilt 1:1 für Phase 2: Reducer + AI sind transformations, threat-surface = null jenseits der bereits in Phase 1 gelockten ESLint-Rules.

## Sources

### Primary (HIGH confidence)
- **Phase 1 CONTEXT.md** (D-01..D-19) — locked decisions vererbt
- **Phase 2 CONTEXT.md** (D-20..D-25) — phase-specific locks
- **Phase 1 `01-02-SUMMARY.md`** — was Engine-Core schon liefert (RNG, damage, accuracy, typeChart)
- **`src/engine/types.ts`, `rng.ts`, `damage.ts`, `accuracy.ts`, `typeChart.ts`** — gelesene tatsächliche Implementation
- **`src/data/schemas.ts`** — für `Move` Schema mit bereits-required `priority`-Feld (impacted A1)
- **`vitest.workspace.ts`** — confirmed engine workspace + node env
- **`eslint.config.js`** — confirmed engine-purity rules sind aktiv
- **`package.json`** — confirmed alle Phase-2-relevanten Dependencies bereits installed
- **`.planning/REQUIREMENTS.md`** — ENG-06, ENG-09, AI-01 + Traceability-Map
- **`.planning/ROADMAP.md`** — Phase 2 Goal + Success Criteria
- **TypeScript Handbook** (kompiliertes Wissen aus Training) — diskriminated unions, `satisfies` operator (TS 4.9+), exhaustive switch checking via `never`-default

### Secondary (MEDIUM confidence)
- **Bulbapedia "Damage" + "Speed" articles** (Trainings-Wissen) — Resolution-Order: priority → speed; Bulbapedia bestätigt das auch für Gen 1 (mit der Quirk: in Gen 1 war Speed-Tie eine Speed-Stat-Comparison, in modern Smogon ist es ein 50/50 Coin Flip — D-23 wählt modern)
- **Smogon University Battle-Mechanics-Doku** — Stat-stages-Formel `2/(2+x)` für Phase 6 (außerhalb Phase-2-Scope, nur informational); `priority brackets` (Quick-Attack +1, Trick-Room nicht in Gen 1, etc.)
- **Pokémon Showdown server-protocol** — Inspiration für BattleEvent-Granularität (`|move|p1a: Charmander|Ember|p2a: Bulbasaur` etc.) — wir schlanken das ab auf JS-typisierte Events

### Tertiary (LOW confidence)
- **Best practices für rekursive Reducer mit Auto-Transitions** — basiert auf XState-„always"-Doku + Redux-Toolkit-Thunks; nicht eine kanonische einzelne Quelle. Keine Risiko weil das Pattern in mehreren Codebases bewährt ist (Pokémon-Showdown-Client, viele Roguelike-Engines).

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — Phase 1 hat bereits alle Deps gepinnt, kein Library-Choice mehr offen
- Architecture (FSM-Pattern, Reducer-Shape): **HIGH** — diskriminierte Unions + lookup-table sind die kanonische TS-FSM-Form, vom User-Stack (kein XState) bestätigt
- Pitfalls: **HIGH** — die 8 aufgeführten Fallen sind alle in der Pokémon-Game-Dev-Community + funktionalen-Reducer-Dev-Community gut dokumentiert, viele auch direkt aus Phase-1-Code-Audit ableitbar (RNG-counter-Order, Engine-Purity)
- Validation Architecture: **HIGH** — Phase 1 hat das Test-Pattern vorgegeben (it.each, golden-baseline mit Wave-0-Lock), Phase 2 adaptiert das 1:1
- Security: **HIGH** — Engine ist purer Code, threat-surface ist abgehakelt mit Phase-1-ESLint-Rules

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 Tage; FSM-Patterns + TS-Idioms sind stabil. Wenn Phase 2 nicht innerhalb von 30 Tagen startet, refresh nur die `npm view`-Versionen der bereits-installierten Deps.)
