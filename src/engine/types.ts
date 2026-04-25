// src/engine/types.ts
// Engine-internal types — pure TypeScript, no React imports.
// 15 Gen-1 types per D-06 (modern chart minus Steel/Dark/Fairy).
export type GenOneType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon';

export const GEN_ONE_TYPES: readonly GenOneType[] = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
] as const;

export type DamageClass = 'physical' | 'special' | 'status';
export type TypeMultiplier = 0 | 0.5 | 1 | 2;
export type TypeChart = Record<GenOneType, Record<GenOneType, TypeMultiplier>>;

export interface Combatant {
  level: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  types: readonly GenOneType[]; // 1 or 2 entries
}

export interface MoveLike {
  power: number | null; // null = status move
  type: GenOneType;
  damageClass: DamageClass;
  /**
   * Move priority bracket per D-23. Default 0. Quick-Attack-style moves (Phase 8)
   * set +1. Phase 2 reads `move.priority ?? 0` so all existing Phase-1 fixtures
   * that omit this field keep compiling unchanged (additive + optional).
   */
  priority?: number;
  /**
   * Move accuracy in percent (0–100) per Phase-1 D-09. `null` = always-hit
   * (Swift-style). Optional + additive: Phase-1 fixtures without accuracy keep
   * compiling. Reducer reads `move.accuracy ?? null` and forwards to
   * `rollAccuracy`, which maps `null → always true` and clamps numeric values
   * to the 70% floor.
   */
  accuracy?: number | null;
  /**
   * Display name for battle-log strings — `moveUsed` event reads
   * `move.name ?? '???'`. Optional so Phase-1 numeric-only fixtures still type-check.
   */
  name?: string;
}

// -----------------------------------------------------------------------------
// Phase 2 battle types — D-20..D-25
// Pure type definitions; no runtime imports. The Phase-1 ESLint engine-purity
// rule keeps this file react/Math.random/Date.now/data-import free.
// -----------------------------------------------------------------------------

/** Which side of the battle a participant or event belongs to. */
export type Side = 'player' | 'enemy';

/** Slot index in a participant's `moves` tuple (always 4 slots in Gen-1). */
export type MoveIndex = 0 | 1 | 2 | 3;

/**
 * 9-phase FSM locked by D-21. The full union ships from Phase 2 onward; Phase 2
 * tests only exercise a subset (selecting → resolving → animating* → turnEnd →
 * faintCheck → battleOver). `forceSwitch` activates in Phase 5 once teams exist;
 * `enemyFaintReward` activates in Phase 4 with XP/level-up.
 */
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

/**
 * Stat-stage skeleton per D-20. Wertebereich -6..+6 per Smogon convention.
 * Apply-Logik + Multiplier-Tabelle in Phase 6 (`engine/statStages.ts`).
 * Phase 2 initialisiert nur, mutiert nicht.
 */
export interface StatStages {
  atk: number;
  def: number;
  spA: number;
  spD: number;
  spe: number;
  acc: number;
  eva: number;
}

/**
 * Battle-time projection of a Combatant: adds runtime HP, base speed (Phase 2
 * reads this directly; Phase 6 will project speed through statStages.spe),
 * species name (for log strings), embedded moves (D-25 / A1: no MoveId-lookup
 * in Phase 2 — moves live on the participant), and the stat-stage skeleton.
 */
export interface BattleParticipant extends Combatant {
  hp: number;
  maxHp: number;
  speed: number;
  species: string;
  moves: readonly MoveLike[];
  statStages: StatStages;
}

/**
 * Snapshot of a 1v1 battle. Phase 2 keeps the shape minimal: the two
 * combatants, the current phase, the turn counter, and a slot for the
 * player's pending move pick (set during `selecting`, consumed during
 * `resolving`).
 */
export interface BattleState {
  phase: BattlePhase;
  turnNumber: number;
  combatants: {
    player: BattleParticipant;
    enemy: BattleParticipant;
  };
  /**
   * Set when the player picks a move during `selecting`; cleared when
   * `resolving` consumes it. Lets `handleResolving` know what the player
   * chose without re-dispatching.
   */
  pendingPlayerAction: { type: 'pickMove'; moveIndex: MoveIndex } | null;
}

/**
 * 5-variant action union locked by D-22. Phase 2 tests only fire `pickMove` +
 * `continue`; `switchTo` activates in Phase 5, `useItem` in Phase 6, `run`
 * stays available throughout but is wired in Plan 02-02's `handleSelecting`.
 */
export type BattleAction =
  | { type: 'pickMove'; moveIndex: MoveIndex }
  | { type: 'switchTo'; partyIndex: number }
  | { type: 'useItem'; itemId: string; targetPartyIndex?: number }
  | { type: 'run' }
  | { type: 'continue' };

/**
 * Discriminated event union — exhaustive per `switch (e.type)`. Order within a
 * turn is part of the API (locked in 02-RESEARCH §Pattern 3):
 *
 *   turnStart
 *   → moveUsed
 *   → [moveMissed | (crit?) → (super/notVery/noEffect)? → damageDealt → hpChanged → (fainted)?]
 *     for first mover
 *   → same for second mover (skipped if KO'd by first)
 *   → turnEnd
 *   → optional battleEnded
 *
 * Phase-4 UI iterates the events and triggers animations + battle-log strings
 * in exactly that order.
 */
export type BattleEvent =
  | { type: 'turnStart'; turnNumber: number }
  | { type: 'moveUsed'; side: Side; moveName: string }
  | { type: 'moveMissed'; side: Side; moveName: string }
  | { type: 'crit'; side: Side }
  | { type: 'superEffective'; multiplier: number }
  | { type: 'notVeryEffective'; multiplier: number }
  | { type: 'noEffect' }
  | { type: 'damageDealt'; side: Side; amount: number }
  | { type: 'hpChanged'; side: Side; from: number; to: number; max: number }
  | { type: 'fainted'; side: Side }
  | { type: 'turnEnd'; turnNumber: number }
  | { type: 'battleEnded'; winner: Side };
