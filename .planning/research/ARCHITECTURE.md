# Architecture Research

**Domain:** Turn-based RPG / Roguelike — single-page browser game (React 18 + TypeScript)
**Researched:** 2026-04-25
**Confidence:** MEDIUM (web search blocked — informed by established patterns + project spec; verify save-versioning + RNG choice during Phase 0 setup)

> **Verification note:** WebSearch was unavailable for this research. Recommendations below are derived from well-known patterns (Redux/useReducer, Pokémon damage formula, classic FSM design, mulberry32 PRNG) and the existing PokeTrail spec. Library version pins should be re-confirmed in Phase 0 via Context7.

---

## 1. Architectural Thesis

PokeTrail is a **deterministic, turn-based simulation** wrapped in a React presentation layer. The single most important architectural decision is already made by the spec:

> **The game engine has zero React imports.** UI subscribes to engine output; engine never reaches into UI.

Everything else flows from this. If you only remember three rules:

1. **Engine is pure** — `(state, action, rng) → newState`. No side effects. No React. No `Date.now()`. No `Math.random()`.
2. **Battle is a finite state machine** — phase transitions are explicit, not implied by which buttons are visible.
3. **RNG is seedable + serialised** — every random roll comes from a PRNG whose seed lives in the save file.

These three rules make the game testable, replayable, and save/load safe. Violating any of them produces "ghost bugs" that only appear after a refresh.

---

## 2. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (React)                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Title /    │ │ Battle     │ │ Route Map  │ │ Team / Bag │   │
│  │ Starter    │ │ Screen     │ │            │ │ Pokedex    │   │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘   │
│        │              │              │              │            │
│        └──────────────┴──────┬───────┴──────────────┘            │
│                              │ dispatch(action)                  │
│                              │ useGame() / useBattle()           │
├──────────────────────────────┼──────────────────────────────────┤
│                       ORCHESTRATION LAYER                        │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  GameContext (React Context + useReducer)              │     │
│  │  - Holds GameState                                     │     │
│  │  - Routes actions → engine functions                   │     │
│  │  - Schedules side-effects (autosave, animation timers) │     │
│  └────────────────────────┬───────────────────────────────┘     │
│                           │ pure function calls                  │
├───────────────────────────┼─────────────────────────────────────┤
│                       ENGINE LAYER (pure TS)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐  │
│  │ battle   │ │ levelUp  │ │ route    │ │ item     │ │  ai  │  │
│  │ (damage, │ │ (xp,     │ │Generator │ │ Effects  │ │      │  │
│  │ STAB,    │ │ evolve)  │ │ (seeded) │ │          │ │      │  │
│  │ status)  │ │          │ │          │ │          │ │      │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────┘  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  typeChart  │  rng (mulberry32)  │  damage formula     │     │
│  └────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│                       DATA LAYER                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐    │
│  │ Static JSON      │  │ localStorage     │  │ PokeAPI     │    │
│  │ (gen1 pokemon,   │  │ (save, pokedex,  │  │ (sprites    │    │
│  │  moves, gym      │  │  settings)       │  │  only,      │    │
│  │  leaders, items) │  │                  │  │  lazy load) │    │
│  └──────────────────┘  └──────────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Direction of dependencies:** Presentation → Orchestration → Engine → Data. Never the other way. Engine must compile and pass tests with zero React or DOM dependencies.

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **Screens** (`components/screens/`) | Render current GameState; emit user intent as actions | React function components, no business logic |
| **Battle widgets** (`components/battle/`) | Render battle sub-views (HP bar, sprite, log) | Dumb props-only components |
| **GameContext** (`context/GameContext.tsx`) | Hold state, dispatch actions, run autosave, expose hooks | `useReducer` + `Context.Provider` |
| **Hooks** (`hooks/`) | Adapt context to component-friendly APIs | Thin wrappers around `useContext` |
| **Engine** (`engine/`) | Pure game logic — damage, XP, evolution, route gen, AI | Plain TS functions: `(input, rng) → output` |
| **Data** (`data/`) | Static content (pokemon, moves, gym leaders) | TS modules / typed JSON imports |
| **Persistence** (`utils/storage.ts`) | Read/write/migrate localStorage | Versioned save schema |
| **API client** (`utils/api.ts`) | Fetch sprite URLs lazily | Plain fetch + cache |

---

## 3. Recommended Project Structure

The spec already prescribes a structure. Two refinements added below (`utils/storage.ts` for versioned persistence, `engine/rng.ts` as a first-class engine module):

```
src/
├── main.tsx
├── App.tsx
├── index.css                          # Tailwind directives only
│
├── components/
│   ├── screens/                       # Top-level screens (one per GameState.screen)
│   │   ├── TitleScreen.tsx
│   │   ├── StarterSelect.tsx
│   │   ├── BattleScreen.tsx
│   │   ├── RewardScreen.tsx
│   │   ├── RouteMap.tsx
│   │   ├── TeamView.tsx
│   │   ├── BagView.tsx
│   │   ├── PokedexView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── GameOverScreen.tsx
│   │   └── VictoryScreen.tsx
│   ├── battle/                        # Battle-specific sub-components
│   │   ├── PokemonSprite.tsx
│   │   ├── HealthBar.tsx
│   │   ├── MoveButton.tsx
│   │   ├── BattleLog.tsx
│   │   └── StatusBadge.tsx
│   ├── ui/                            # Reusable primitives (no game knowledge)
│   │   ├── Card.tsx
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── ProgressBar.tsx
│   │   └── TypeBadge.tsx
│   └── layout/
│       ├── Header.tsx
│       └── ScreenTransition.tsx
│
├── context/
│   ├── GameContext.tsx                # Provider + reducer wiring
│   └── reducer.ts                     # Pure reducer (calls into engine/)
│
├── hooks/
│   ├── useGame.ts                     # Access full GameState + dispatch
│   ├── useBattle.ts                   # Battle-only selectors + actions
│   ├── usePokemonSprite.ts            # Lazy sprite URL loader
│   └── useAutoSave.ts                 # Debounced localStorage write
│
├── engine/                            # PURE — no React, no DOM, no fetch
│   ├── battle.ts                      # Damage, turn order, status apply
│   ├── damage.ts                      # Pure damage formula
│   ├── typeChart.ts                   # 18×18 effectiveness lookup
│   ├── routeGenerator.ts              # Seeded route + encounter list
│   ├── levelUp.ts                     # XP curve, stat growth, evolution
│   ├── itemEffects.ts                 # Item → state mutation
│   ├── ai.ts                          # Enemy move selection
│   ├── rng.ts                         # Seedable PRNG (mulberry32)
│   └── battleMachine.ts               # Battle FSM transition table
│
├── data/                              # Build-time content
│   ├── pokemon-gen1.json              # Generated at build, typed via .d.ts
│   ├── moves-gen1.json
│   ├── items.ts
│   ├── gymLeaders.ts
│   ├── eliteFour.ts
│   └── typeColors.ts
│
├── types/
│   ├── pokemon.ts
│   ├── battle.ts
│   ├── items.ts
│   ├── game.ts
│   └── save.ts                        # SaveV1, SaveV2 union for migrations
│
└── utils/
    ├── storage.ts                     # Versioned save read/write/migrate
    ├── api.ts                         # PokeAPI sprite fetch
    ├── format.ts                      # Display helpers
    └── debounce.ts
```

### Structure Rationale

- **`engine/` as a hard boundary:** Easy to enforce with an ESLint rule (`no-restricted-imports` for `react`, `react-dom` inside `engine/`). One-line guarantee that the engine stays pure.
- **`engine/rng.ts` is its own module:** RNG is engine state — promoting it to a top-level module signals "do not use Math.random anywhere else."
- **`engine/battleMachine.ts` separated from `battle.ts`:** FSM transition table is declarative; combat math is procedural. Splitting them makes both easier to read and test.
- **`context/reducer.ts` separated from Provider:** Keeps the reducer pure and importable into tests without React.
- **`utils/storage.ts` owns the schema version:** Single chokepoint for migrations; nobody touches `localStorage` directly except this file.
- **`types/save.ts` distinct from `types/game.ts`:** Save schema is a *contract* with users' browsers — it must be versioned and never mutated retroactively. Runtime `GameState` can change freely; persisted shape cannot.

---

## 4. Architectural Patterns

### Pattern 1: Pure Engine + Reducer Adapter

**What:** All game state transitions live as pure functions in `engine/`. The reducer is a thin switch that picks the right engine function and threads RNG through.

**When to use:** Every gameplay action. UI components never call engine functions directly.

**Trade-offs:** Slightly more indirection (action → reducer → engine call) in exchange for trivial unit tests, deterministic replays, and a clean refactor path to a server-authoritative engine later.

**Example:**

```typescript
// engine/battle.ts — PURE
export function executePlayerMove(
  state: BattleState,
  moveIndex: number,
  rng: RNG
): BattleState {
  const move = state.playerPokemon.moves[moveIndex];
  const damage = calculateDamage(state.playerPokemon, state.enemyPokemon, move, rng);
  return {
    ...state,
    enemyPokemon: { ...state.enemyPokemon, hp: Math.max(0, state.enemyPokemon.hp - damage) },
    log: [...state.log, `${state.playerPokemon.name} used ${move.name}!`],
    phase: 'animating',
  };
}

// context/reducer.ts — adapter
export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'BATTLE/PLAYER_MOVE': {
      if (!state.run?.battleState) return state;
      const rng = createRng(state.run.rngSeed, state.run.rngCounter);
      const nextBattle = executePlayerMove(state.run.battleState, action.moveIndex, rng);
      return {
        ...state,
        run: { ...state.run, battleState: nextBattle, rngCounter: rng.counter },
      };
    }
    // ...
  }
}
```

### Pattern 2: Battle as an Explicit Finite State Machine

**What:** The `BattleState.phase` field and a transition table in `engine/battleMachine.ts` define exactly which actions are legal in which phase.

**When to use:** Anywhere user input must be gated by ongoing animations or AI turns. Especially battles.

**Trade-offs:** A few more lines than `if (isAnimating) return;` checks scattered through the code, but eliminates "double-click bug" categories entirely.

**Phase definitions:**

| Phase | What's happening | Legal player input | Auto-transitions to |
|-------|-----------------|---------------------|---------------------|
| `selecting` | Waiting for player to choose move/switch/item | Move, Switch, Item, Run | `resolving` |
| `resolving` | Engine computes turn outcome (both moves, status, fainting) | none | `animatingPlayer` or `animatingEnemy` (by speed) |
| `animatingPlayer` | UI shows player's action | none | `animatingEnemy` (if enemy alive) or `turnEnd` |
| `animatingEnemy` | UI shows enemy's action | none | `turnEnd` |
| `turnEnd` | Apply end-of-turn effects (burn, poison, leftovers) | none | `selecting` or `faintCheck` |
| `faintCheck` | A pokemon hit 0 HP | If player faints: force switch | `forceSwitch` or `enemyFaintReward` |
| `forceSwitch` | Player's pokemon fainted, must pick replacement | Switch only | `selecting` |
| `enemyFaintReward` | Enemy fainted; XP, level-up, evolve, capture prompt | Capture, Skip | `battleOver` |
| `battleOver` | Battle resolved | Continue | exit to `route` or `gameOver` |

**Example:**

```typescript
// engine/battleMachine.ts
export type BattlePhase =
  | 'selecting' | 'resolving' | 'animatingPlayer' | 'animatingEnemy'
  | 'turnEnd' | 'faintCheck' | 'forceSwitch' | 'enemyFaintReward' | 'battleOver';

export type BattleAction =
  | { type: 'SELECT_MOVE'; moveIndex: number }
  | { type: 'SELECT_SWITCH'; pokemonIndex: number }
  | { type: 'SELECT_ITEM'; itemId: string }
  | { type: 'ANIMATION_DONE' }
  | { type: 'CAPTURE'; accept: boolean };

const LEGAL_ACTIONS: Record<BattlePhase, BattleAction['type'][]> = {
  selecting:        ['SELECT_MOVE', 'SELECT_SWITCH', 'SELECT_ITEM'],
  resolving:        [],
  animatingPlayer:  ['ANIMATION_DONE'],
  animatingEnemy:   ['ANIMATION_DONE'],
  turnEnd:          ['ANIMATION_DONE'],
  faintCheck:       ['ANIMATION_DONE'],
  forceSwitch:      ['SELECT_SWITCH'],
  enemyFaintReward: ['CAPTURE'],
  battleOver:       ['ANIMATION_DONE'],
};

export function isLegal(phase: BattlePhase, action: BattleAction): boolean {
  return LEGAL_ACTIONS[phase].includes(action.type);
}
```

The reducer rejects illegal actions silently (or logs a warning in dev). The UI hides buttons when their action is illegal — but never relies on that for correctness.

### Pattern 3: Seedable RNG threaded through engine calls

**What:** A small PRNG (mulberry32 or splitmix32 — ~10 lines of code) seeded from the run's `rngSeed`. The seed lives in the save file; a `rngCounter` advances on every call so resuming after save/load produces the same outcomes.

**When to use:** Every random decision in the engine — damage variance, AI choices, route generation, encounter selection, item drops, capture rolls, status effects.

**Trade-offs:** A small upfront discipline cost (never call `Math.random()` in `engine/`) for huge gains: reproducible bug reports, save/load that doesn't change outcomes, deterministic Vitest assertions, and trivial future "daily seed" feature.

**Example:**

```typescript
// engine/rng.ts
export interface RNG {
  next(): number;          // [0, 1)
  nextInt(min: number, max: number): number; // inclusive both ends
  pick<T>(arr: readonly T[]): T;
  readonly counter: number;
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number, startCounter = 0): RNG {
  let counter = startCounter;
  // Replay: advance counter by re-seeding deterministically
  const base = mulberry32(seed);
  for (let i = 0; i < startCounter; i++) base();
  return {
    get counter() { return counter; },
    next() { counter++; return base(); },
    nextInt(min, max) { return min + Math.floor(this.next() * (max - min + 1)); },
    pick<T>(arr: readonly T[]): T { return arr[this.nextInt(0, arr.length - 1)]; },
  };
}
```

**Important:** Increment `rngCounter` in the reducer after every engine call that consumed RNG, and persist `rngCounter` in the save. That way "load run" → identical next-roll outcome.

### Pattern 4: Versioned Save Schema with Forward Migrations

**What:** Persisted state has a `version` field. `utils/storage.ts` knows the current version and a chain of migration functions from any older version up to current.

**When to use:** From day 1. Every save you write today is a save you must be able to read forever (or knowingly invalidate with a user-facing message).

**Trade-offs:** A few extra LoC per schema change, but zero churn for users who refresh the tab after an update.

**Example:**

```typescript
// types/save.ts
export type SaveAny = SaveV1 | SaveV2;
export interface SaveV1 { version: 1; team: PokemonV1[]; bag: ItemV1[]; /* ... */ }
export interface SaveV2 { version: 2; team: PokemonV2[]; bag: ItemV1[]; rngSeed: number; rngCounter: number; }
export const CURRENT_SAVE_VERSION = 2 as const;
export type CurrentSave = SaveV2;

// utils/storage.ts
const KEY = 'poketrail.save';

const migrations: Record<number, (s: SaveAny) => SaveAny> = {
  1: (s) => {
    const v1 = s as SaveV1;
    return {
      ...v1,
      version: 2,
      team: v1.team.map(upgradePokemonV1toV2),
      rngSeed: Math.floor(Math.random() * 0xFFFFFFFF), // legacy save: re-seed
      rngCounter: 0,
    } as SaveV2;
  },
  // future: 2: (s) => ({ ...s, version: 3, /* ... */ })
};

export function loadSave(): CurrentSave | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    let parsed = JSON.parse(raw) as SaveAny;
    if (typeof parsed.version !== 'number') return null; // pre-versioned junk
    while (parsed.version < CURRENT_SAVE_VERSION) {
      const migrate = migrations[parsed.version];
      if (!migrate) {
        console.warn(`No migration from v${parsed.version}; discarding save.`);
        return null;
      }
      parsed = migrate(parsed);
    }
    return parsed as CurrentSave;
  } catch {
    return null;
  }
}

export function writeSave(save: CurrentSave): void {
  localStorage.setItem(KEY, JSON.stringify(save));
}
```

**Convention:** Bump `CURRENT_SAVE_VERSION` whenever any persisted shape changes. Even tiny renames (e.g. `hp` → `currentHp`) need a migration. The Pokedex and Settings get their own versioned files (`poketrail.pokedex`, `poketrail.settings`) so a save corruption doesn't take them down with it.

### Pattern 5: Animation Choreography via Phase + Timer (not setState chains)

**What:** UI watches `BattleState.phase`. When phase enters `animatingPlayer`, UI plays the animation, then dispatches `ANIMATION_DONE`. The engine drives state, the UI controls timing.

**Why:** Putting `setTimeout` chains inside the reducer makes it impure and untestable. Putting state mutations inside `useEffect` cleanups makes ordering bugs invisible. The phase-driven approach keeps the engine deterministic and the UI fully in charge of "feel" (settings can speed up animations without engine knowledge).

**Example:**

```typescript
// components/screens/BattleScreen.tsx
function BattleScreen() {
  const { battle, dispatch, settings } = useBattle();
  useEffect(() => {
    if (battle.phase === 'animatingPlayer' || battle.phase === 'animatingEnemy') {
      const ms = settings.battleSpeed === 'fast' ? 200 : 600;
      const t = setTimeout(() => dispatch({ type: 'BATTLE/ANIMATION_DONE' }), ms);
      return () => clearTimeout(t);
    }
  }, [battle.phase, settings.battleSpeed, dispatch]);
  // ...render
}
```

---

## 5. Data Flow

### User Action Flow

```
[User clicks Move button]
        │
        ▼
[BattleScreen.onClick → dispatch({ type: 'BATTLE/PLAYER_MOVE', moveIndex })]
        │
        ▼
[gameReducer(state, action)]
        │
        ├─ guard: isLegal(state.run.battleState.phase, action)?
        │
        ├─ createRng(state.run.rngSeed, state.run.rngCounter)
        │
        ├─ engine.battle.executePlayerMove(battleState, moveIndex, rng)
        │       │
        │       └─ engine.damage.calculate(...) → pure number
        │
        └─ return new GameState (battle.phase = 'animatingPlayer', rngCounter += n)
        │
        ▼
[React re-renders BattleScreen with new phase]
        │
        ▼
[useEffect fires animation timer]
        │
        ▼
[setTimeout → dispatch({ type: 'BATTLE/ANIMATION_DONE' })]
        │
        ▼
[reducer transitions phase: animatingPlayer → animatingEnemy → turnEnd → selecting]
        │
        ▼
[useAutoSave debounced effect writes save to localStorage]
```

### State Subscription

```
   GameContext.Provider
   ┌────────────────────┐
   │  state, dispatch   │
   └─────────┬──────────┘
             │ React Context
   ┌─────────┴──────────┐
   │  useGame()         │  ← screens
   │  useBattle()       │  ← BattleScreen + battle widgets
   │  useTeam()         │  ← TeamView, RewardScreen
   │  useAutoSave()     │  ← App-level effect
   └────────────────────┘
```

### Key Data Flows

1. **Run start:** Title → New Run → reducer creates `RunState` with new `rngSeed = Date.now() ^ Math.random()*0xFFFFFFFF` and `rngCounter = 0` → routeGenerator(seed) → first encounter scheduled.
2. **Battle turn:** Player action → engine resolves → phase chain advances UI → autosave on `selecting` reentry.
3. **Save load:** App boot → `storage.loadSave()` → migrate if needed → if valid, GameContext seeded with that state and Title shows "Continue Run."
4. **Sprite fetch:** Component mounts → `usePokemonSprite(id)` → cache hit returns URL; cache miss fetches from PokeAPI and caches in module-level Map (no need to persist — refresh re-fetches).
5. **Pokedex update:** Encounter ends → reducer marks pokemon as `seen`; capture marks as `caught`; pokedex saved to its own localStorage key.

---

## 6. Build Order Implications

The architecture suggests a layered build. Each layer should be testable before the next is started:

| Order | Layer | Deliverable | Verification |
|-------|-------|-------------|--------------|
| 1 | Engine: types, RNG, typeChart | `engine/types/`, `engine/rng.ts`, `engine/typeChart.ts` | Vitest: RNG is deterministic for a seed; type chart returns correct multipliers |
| 2 | Engine: damage formula | `engine/damage.ts` | Vitest: golden test cases for damage with known seeds |
| 3 | Engine: battle FSM | `engine/battleMachine.ts`, `engine/battle.ts` | Vitest: complete battle simulated turn-by-turn |
| 4 | Engine: levelUp, ai | `engine/levelUp.ts`, `engine/ai.ts` | Vitest |
| 5 | Engine: routeGenerator | `engine/routeGenerator.ts` | Vitest: same seed → same route |
| 6 | Persistence: storage + migrations | `utils/storage.ts`, `types/save.ts` | Vitest: round-trip save; migrate v1 fixture to current |
| 7 | Orchestration: GameContext + reducer | `context/reducer.ts`, `context/GameContext.tsx` | Vitest on reducer, no React needed |
| 8 | Static data: pokemon-gen1.json + items + gymLeaders | `data/*` | Build script, manual check counts (151 pokemon) |
| 9 | UI primitives: Button, Card, TypeBadge, ProgressBar | `components/ui/*` | Storybook-style manual check |
| 10 | Battle widgets + BattleScreen | `components/battle/*`, `screens/BattleScreen.tsx` | Manual playtest |
| 11 | Other screens (Title, Starter, Route, Team, Bag) | `components/screens/*` | Manual playtest end-to-end |
| 12 | Pokedex + Settings | last, decoupled features | Manual |

**Key insight:** Steps 1–8 ship without rendering anything. The whole game can be unit-tested via the reducer before a single HP bar is drawn. This is the payoff for the strict engine/UI split.

---

## 7. Scaling Considerations

PokeTrail is single-player, client-side, no backend. "Scaling" here means **playtime, run length, and code complexity**, not concurrent users.

| Scale | Adjustments |
|-------|-------------|
| MVP (Phase 1) | Single battle, no save, no routes. State: ~5 KB. No optimization needed. |
| Phase 2-3 (full run) | Save grows to ~20-50 KB (team of 6 + bag + route history). Debounce autosave to ≤1× per second. Run autosave outside the React render path. |
| Phase 4 (polished) | Sprite cache memoizes URLs; consider preloading next-route sprites. PWA service worker caches static assets. |
| Long-term (Gen 2+, Pokedex with 251+ pokemon) | Lazy-load pokemon data per generation; data file gets larger. Consider IndexedDB if save grows >1 MB (unlikely for this scope). |

### Scaling Priorities

1. **First bottleneck (likely):** Re-rendering on every battle log append. Mitigate by either capping log length to last N entries or memoizing log component with `React.memo`.
2. **Second bottleneck (possible):** localStorage write blocking the main thread on autosave. Mitigate by debouncing + only saving on phase transition into `selecting` (i.e., between turns, not mid-animation).
3. **Not a concern:** Engine compute. Damage formula and AI are microsecond-scale on modern hardware for a 1v1 battle.

---

## 8. Anti-Patterns

### Anti-Pattern 1: `Math.random()` inside the engine

**What people do:** Sprinkle `Math.random()` in `damage.ts`, `ai.ts`, `routeGenerator.ts`.
**Why it's wrong:** Tests become flaky. Save/load changes outcomes. Bug reports become unreproducible. "Daily seed" features become impossible to add later.
**Do this instead:** Take an `RNG` parameter on every engine function that needs randomness. Enforce with an ESLint rule (`no-restricted-syntax` for `Math.random` inside `src/engine/**`).

### Anti-Pattern 2: Battle logic inside React components

**What people do:** Compute damage in `BattleScreen`'s onClick handler, then `setBattleState({ ... })`.
**Why it's wrong:** Logic isn't testable without rendering. Two screens with the same logic diverge. Engine refactors require touching UI files.
**Do this instead:** UI emits intents (`dispatch({ type: 'BATTLE/PLAYER_MOVE', moveIndex })`). Reducer routes to engine. Engine returns new state.

### Anti-Pattern 3: `setTimeout` chains inside the reducer

**What people do:** "After damage, wait 500 ms then enemy turn" coded as nested `setTimeout` inside dispatch.
**Why it's wrong:** Reducer becomes impure. Tests can't synchronously assert outcomes. Race conditions when user changes screen mid-animation.
**Do this instead:** Reducer transitions phase synchronously; UI's `useEffect` schedules the timer and dispatches `ANIMATION_DONE` to advance.

### Anti-Pattern 4: Saving the entire React state tree

**What people do:** `localStorage.setItem('save', JSON.stringify(everything))` including UI state like which menu is open.
**Why it's wrong:** Save becomes brittle to UI changes. Schema migrations have to handle UI fields. Save bloats.
**Do this instead:** Persist only the `RunState` + `Pokedex` + `Settings`. UI state (`screen`, modal visibility) is reconstructed on load. The `screen` field in `GameState` gets reset to `route` when continuing a run, never to `battle` mid-fight (battles are too fragile to resume mid-turn — finish or discard).

### Anti-Pattern 5: Mutating state in the reducer

**What people do:** `state.run.team[0].hp -= damage; return state;`
**Why it's wrong:** React doesn't detect change → no re-render. Tests pass with stale references. Time-travel debugging breaks.
**Do this instead:** Always return new objects/arrays. Use spread or — for nested updates — a small helper like `immer` (only if needed; the spec's flat shape rarely requires it).

### Anti-Pattern 6: Directly fetching PokeAPI for gameplay data

**What people do:** `await fetch('/api/pokemon/4')` to get Charmander's stats during battle setup.
**Why it's wrong:** Network latency stalls UI. API outages make the game unplayable. Spec already forbids this.
**Do this instead:** Build-time script writes `data/pokemon-gen1.json`. Runtime imports it as a typed module. PokeAPI is touched only for sprite URLs, lazy, with a graceful fallback to a placeholder image.

### Anti-Pattern 7: Resuming a battle mid-turn from a save

**What people do:** Persist `BattleState` and try to restore it on load.
**Why it's wrong:** UI animation state, partial damage, "the player is choosing whether to capture" — too many states to safely round-trip. Loss of trust if a save corrupts a battle.
**Do this instead:** Autosave only between battles (when phase enters `selecting` of a new encounter, or after `battleOver` resolves). If user closes the tab mid-battle, the save reflects the *start* of that encounter or the previous route node.

---

## 9. Integration Points

### External Services

| Service | Pattern | Notes |
|---------|---------|-------|
| PokeAPI (sprites) | Lazy fetch on first render, in-memory `Map<id, url>` cache | Use `pokemon/{id}/sprites.other['official-artwork'].front_default`. Fall back to `/sprites/pokemon/{id}.png` static if API down. |
| PokeAPI (build-time data fetch) | Node script `scripts/fetch-gen1.ts` writes `data/pokemon-gen1.json` | Run during `npm run build:data` (manual or pre-build). Result committed to repo so builds are offline-safe. |
| Vercel | Git-driven deploys, no env vars needed | Static SPA. Add `vercel.json` for SPA fallback (`rewrite all → /index.html`). |
| localStorage | `utils/storage.ts` only | Three keys: `poketrail.save`, `poketrail.pokedex`, `poketrail.settings`. Each independently versioned. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ Orchestration | React Context + custom hooks (`useGame`, `useBattle`) | Hooks expose narrow slices to limit re-renders |
| Orchestration ↔ Engine | Direct function calls; engine returns new state | Reducer threads RNG and bumps counter |
| Engine ↔ Data | Typed imports of static JSON/TS modules | Engine never reads from localStorage or fetches |
| Engine ↔ Persistence | None directly | Reducer passes engine output to `storage.writeSave` (via autosave hook) |

---

## 10. Testing Strategy

The architecture makes testing trivially partitioned:

- **Engine** (`engine/**`): Unit-test with Vitest. No mocks needed (no React, no DOM, no network). Use fixed RNG seeds for golden assertions. ~80% of test effort.
- **Reducer** (`context/reducer.ts`): Unit-test with Vitest. Construct an action, assert next state. ~15% of test effort.
- **Persistence** (`utils/storage.ts`): Unit-test with Vitest using `happy-dom` or stubbing `localStorage`. Critical: test each migration with a fixture from the previous version.
- **UI** (`components/**`): Manual playtest per spec. Optionally Storybook for primitives. ~5% of test effort.

**Engine test example:**

```typescript
// engine/__tests__/battle.test.ts
import { executePlayerMove } from '../battle';
import { createRng } from '../rng';

test('Charmander Tackle vs Bulbasaur deals 4-5 dmg at L5', () => {
  const rng = createRng(42); // fixed seed
  const next = executePlayerMove(initialBattle, /*moveIndex=*/0, rng);
  expect(next.enemyPokemon.hp).toBe(initialBattle.enemyPokemon.hp - 5);
  expect(next.phase).toBe('animatingPlayer');
});
```

This test runs in milliseconds, requires no DOM, and is fully deterministic.

---

## Sources

- PokeTrail spec: `/Users/lippi304/Documents/PokeTrail/poketrail.md` (HIGH)
- PokeTrail PROJECT.md: `/Users/lippi304/Documents/PokeTrail/.planning/PROJECT.md` (HIGH)
- Standard React useReducer + Context patterns (training data, MEDIUM — confirm in Phase 0 setup)
- mulberry32 PRNG (Tommy Ettinger, public domain — well-known short PRNG suitable for non-cryptographic game randomness)
- Pokémon Gen 1 damage formula (Bulbapedia, well-documented)
- General save-versioning patterns from web app development practice (MEDIUM)

**Confidence calibration:**
- HIGH: engine-vs-UI split, FSM pattern, build order — directly derived from spec + standard practice.
- MEDIUM: specific PRNG choice, schema-versioning details — recommended approach is sound but verify alternatives in Phase 0 if user prefers a different style.
- LOW: none flagged as low-confidence; the architecture is conventional for this domain.

---
*Architecture research for: PokeTrail (Pokémon roguelike browser game)*
*Researched: 2026-04-25*
