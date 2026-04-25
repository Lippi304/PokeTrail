// src/engine/__tests__/battle-fixtures.ts
// Test fixtures for Phase-2 battle reducer tests. NOT a test file — the
// vitest workspace glob is `*.test.ts`, so this module is import-only.
//
// Decoupled from src/data/** because DATA-01..05 are still pending (Phase-1
// plan 03 not yet executed) — see 02-RESEARCH §A5. The values are
// research-grade but not meant to mirror canonical Smogon Lvl-5 stats; they
// exist purely so the reducer can be exercised end-to-end with reproducible
// numbers.
//
// Engine-purity rules from D-14 still apply (this file lives under
// src/engine/__tests__/): no react, no Math.random, no Date.now, no
// src/data/** imports.

import type {
  BattleParticipant,
  BattleState,
  GenOneType,
  MoveLike,
  StatStages,
  TypeChart,
  TypeMultiplier,
} from '../types';
import { GEN_ONE_TYPES } from '../types';

const ZERO_STAGES: StatStages = {
  atk: 0,
  def: 0,
  spA: 0,
  spD: 0,
  spe: 0,
  acc: 0,
  eva: 0,
};

/** Build a MoveLike for tests with sensible defaults. */
export function makeMove(spec: {
  name: string;
  type: GenOneType;
  power: number | null;
  damageClass: 'physical' | 'special' | 'status';
  accuracy?: number | null;
  priority?: number;
}): MoveLike {
  return {
    name: spec.name,
    type: spec.type,
    power: spec.power,
    damageClass: spec.damageClass,
    accuracy: spec.accuracy ?? 100,
    priority: spec.priority ?? 0,
  };
}

/** Charmander Lvl 5 fixture (handcrafted; not from src/data/). */
export function makeCharmander(
  overrides?: Partial<BattleParticipant>,
): BattleParticipant {
  return {
    species: 'Charmander',
    level: 5,
    hp: 19,
    maxHp: 19,
    speed: 13,
    attack: 10,
    defense: 9,
    spAttack: 12,
    spDefense: 10,
    types: ['fire'],
    moves: [
      makeMove({
        name: 'Ember',
        type: 'fire',
        power: 40,
        damageClass: 'special',
        accuracy: 100,
      }),
      makeMove({
        name: 'Scratch',
        type: 'normal',
        power: 40,
        damageClass: 'physical',
        accuracy: 100,
      }),
      makeMove({
        name: 'Growl',
        type: 'normal',
        power: null,
        damageClass: 'status',
        accuracy: 100,
      }),
    ],
    statStages: { ...ZERO_STAGES },
    ...overrides,
  };
}

/** Bulbasaur Lvl 5 fixture (handcrafted; not from src/data/). */
export function makeBulbasaur(
  overrides?: Partial<BattleParticipant>,
): BattleParticipant {
  return {
    species: 'Bulbasaur',
    level: 5,
    hp: 20,
    maxHp: 20,
    speed: 11,
    attack: 10,
    defense: 11,
    spAttack: 12,
    spDefense: 12,
    types: ['grass', 'poison'],
    moves: [
      makeMove({
        name: 'Vine Whip',
        type: 'grass',
        power: 45,
        damageClass: 'special',
        accuracy: 100,
      }),
      makeMove({
        name: 'Tackle',
        type: 'normal',
        power: 40,
        damageClass: 'physical',
        accuracy: 100,
      }),
      makeMove({
        name: 'Growl',
        type: 'normal',
        power: null,
        damageClass: 'status',
        accuracy: 100,
      }),
    ],
    statStages: { ...ZERO_STAGES },
    ...overrides,
  };
}

/**
 * Minimal type-chart covering all 15 Gen-1 types — defaults every cell to 1×,
 * then overrides the cells that matter for the fire/grass/normal/poison
 * fixtures. Keeps `getTypeMultiplier` happy (which throws on missing entries).
 */
export function makeFixtureChart(): TypeChart {
  const chart = {} as Record<GenOneType, Record<GenOneType, TypeMultiplier>>;
  for (const a of GEN_ONE_TYPES) {
    chart[a] = {} as Record<GenOneType, TypeMultiplier>;
    for (const d of GEN_ONE_TYPES) {
      chart[a][d] = 1;
    }
  }
  // Fire — modern chart cells used in fixtures.
  chart.fire.grass = 2;
  chart.fire.fire = 0.5;
  chart.fire.water = 0.5;
  chart.fire.rock = 0.5;
  chart.fire.ice = 2;
  chart.fire.bug = 2;
  chart.fire.dragon = 0.5;
  // Grass.
  chart.grass.fire = 0.5;
  chart.grass.water = 2;
  chart.grass.grass = 0.5;
  chart.grass.poison = 0.5;
  chart.grass.flying = 0.5;
  chart.grass.bug = 0.5;
  chart.grass.rock = 2;
  chart.grass.ground = 2;
  chart.grass.dragon = 0.5;
  // Normal.
  chart.normal.rock = 0.5;
  chart.normal.ghost = 0;
  // Poison (modern Gen-2+ mapping; Phase 1 D-06 picked the modern chart).
  chart.poison.grass = 2;
  chart.poison.poison = 0.5;
  chart.poison.ground = 0.5;
  chart.poison.rock = 0.5;
  chart.poison.ghost = 0.5;
  // Water — minimal coverage so tests using water-themed fixtures don't trip.
  chart.water.fire = 2;
  chart.water.grass = 0.5;
  chart.water.water = 0.5;
  chart.water.ground = 2;
  chart.water.rock = 2;
  chart.water.dragon = 0.5;
  return chart as TypeChart;
}

/** Build the canonical "battle just opened, player picks a move" state. */
export function makeInitialBattleState(spec: {
  player: BattleParticipant;
  enemy: BattleParticipant;
}): BattleState {
  return {
    phase: 'selecting',
    turnNumber: 1,
    combatants: { player: spec.player, enemy: spec.enemy },
    pendingPlayerAction: null,
  };
}
