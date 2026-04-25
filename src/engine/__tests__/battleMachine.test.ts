// src/engine/__tests__/battleMachine.test.ts
// Wave-0 contract tests for Phase 2 Plan 01.
//
// Task 1: type unions + npm script — Tests 1-5.
// Task 2: isLegal + reducer skeleton — Tests 6-9 (this section).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  BattleAction,
  BattleParticipant,
  BattlePhase,
  BattleState,
  GenOneType,
  MoveLike,
  Side,
  StatStages,
  TypeChart,
} from '../types';
import { createRng } from '../rng';
import { isLegal, reducer } from '../battleMachine';

// -----------------------------------------------------------------------------
// Inline minimal factories — Plan 02-02 will move these to battle-fixtures.ts.
// -----------------------------------------------------------------------------

function makeStatStages(): StatStages {
  return { atk: 0, def: 0, spA: 0, spD: 0, spe: 0, acc: 0, eva: 0 };
}

function makeParticipant(species: string): BattleParticipant {
  return {
    species,
    level: 5,
    attack: 10,
    defense: 10,
    spAttack: 10,
    spDefense: 10,
    speed: 10,
    types: ['normal'] as const satisfies readonly GenOneType[],
    hp: 20,
    maxHp: 20,
    moves: [
      { power: 40, type: 'normal', damageClass: 'physical' },
    ] as const satisfies readonly MoveLike[],
    statStages: makeStatStages(),
  };
}

// -----------------------------------------------------------------------------
// Phase-2 type contract — Wave 0
// -----------------------------------------------------------------------------

describe('Phase 2 types — Wave 0 contract', () => {
  it('Test 1: BattlePhase union exposes exactly the 9 locked phases (D-21)', () => {
    const all: BattlePhase[] = [
      'selecting',
      'resolving',
      'animatingPlayer',
      'animatingEnemy',
      'turnEnd',
      'faintCheck',
      'forceSwitch',
      'enemyFaintReward',
      'battleOver',
    ];
    expect(all).toHaveLength(9);
    expect(new Set(all).size).toBe(9);
  });

  it('Test 2: BattleAction discriminator covers the 5 locked types (D-22)', () => {
    const arr: BattleAction[] = [
      { type: 'pickMove', moveIndex: 0 },
      { type: 'switchTo', partyIndex: 0 },
      { type: 'useItem', itemId: 'potion' },
      { type: 'run' },
      { type: 'continue' },
    ];
    expect(arr.map((a) => a.type).sort()).toEqual(
      ['continue', 'pickMove', 'run', 'switchTo', 'useItem'],
    );
  });

  it('Test 3: BattleParticipant.statStages defaults to zero on all 7 fields (D-20)', () => {
    const p = makeParticipant('test');
    expect(p.statStages.atk).toBe(0);
    expect(p.statStages.def).toBe(0);
    expect(p.statStages.spA).toBe(0);
    expect(p.statStages.spD).toBe(0);
    expect(p.statStages.spe).toBe(0);
    expect(p.statStages.acc).toBe(0);
    expect(p.statStages.eva).toBe(0);
  });

  it('Test 4: MoveLike.priority is optional (D-23 / A1)', () => {
    const withPrio: MoveLike = { power: 40, type: 'normal', damageClass: 'physical', priority: 1 };
    const withoutPrio: MoveLike = { power: 40, type: 'normal', damageClass: 'physical' };
    expect(withPrio.priority ?? 0).toBe(1);
    expect(withoutPrio.priority ?? 0).toBe(0);
  });

  it('Test 5: package.json has "test:engine": "vitest run --project engine"', () => {
    const pkgPath = path.resolve(__dirname, '../../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['test:engine']).toBe('vitest run --project engine');
  });
});

// Force `Side` symbol to be referenced so unused-import lint passes.
const _exposeSide: Side = 'player';
void _exposeSide;

// -----------------------------------------------------------------------------
// Inline state factory for reducer tests (Task 2). Plan 02-02 will move this
// into a shared battle-fixtures.ts.
// -----------------------------------------------------------------------------

function makeState(phase: BattlePhase): BattleState {
  return {
    phase,
    turnNumber: 1,
    combatants: {
      player: makeParticipant('charmander'),
      enemy: makeParticipant('bulbasaur'),
    },
    pendingPlayerAction: null,
  };
}

const STUB_CHART = {} as TypeChart; // never read by skeleton — throw fires first

// -----------------------------------------------------------------------------
// isLegal — exhaustive 9 × 5 truth-table (locked in 02-RESEARCH §Pattern 1)
// -----------------------------------------------------------------------------

const PHASES: BattlePhase[] = [
  'selecting',
  'resolving',
  'animatingPlayer',
  'animatingEnemy',
  'turnEnd',
  'faintCheck',
  'forceSwitch',
  'enemyFaintReward',
  'battleOver',
];

const ACTIONS: BattleAction[] = [
  { type: 'pickMove', moveIndex: 0 },
  { type: 'switchTo', partyIndex: 0 },
  { type: 'useItem', itemId: 'potion' },
  { type: 'run' },
  { type: 'continue' },
];

const EXPECTED: Record<BattlePhase, ReadonlySet<BattleAction['type']>> = {
  selecting: new Set(['pickMove', 'switchTo', 'useItem', 'run']),
  resolving: new Set(['continue']),
  animatingPlayer: new Set(['continue']),
  animatingEnemy: new Set(['continue']),
  turnEnd: new Set(['continue']),
  faintCheck: new Set(['continue']),
  forceSwitch: new Set(['switchTo']),
  enemyFaintReward: new Set(['continue']),
  battleOver: new Set([]),
};

describe('isLegal — 9 × 5 phase × action coverage', () => {
  const cells = PHASES.flatMap((phase) =>
    ACTIONS.map((action) => ({
      phase,
      action,
      expected: EXPECTED[phase].has(action.type),
    })),
  );

  it.each(cells)(
    'isLegal($phase, $action.type) -> $expected',
    ({ phase, action, expected }) => {
      expect(isLegal(phase, action)).toBe(expected);
    },
  );
});

// -----------------------------------------------------------------------------
// Reducer — throw on illegal action (skeleton smoke tests)
// -----------------------------------------------------------------------------

describe('Reducer throws on illegal action', () => {
  it('Test 7: phase=battleOver + pickMove throws (battleOver legal-set is empty)', () => {
    const state = makeState('battleOver');
    const rng = createRng(1);
    expect(() =>
      reducer(state, { type: 'pickMove', moveIndex: 0 }, rng, { typeChart: STUB_CHART }),
    ).toThrow(/illegal action/i);
  });

  it('Test 8: error message names both action.type and phase', () => {
    const state = makeState('battleOver');
    const rng = createRng(1);
    expect(() =>
      reducer(state, { type: 'pickMove', moveIndex: 0 }, rng, { typeChart: STUB_CHART }),
    ).toThrow(/pickMove.*battleOver|battleOver.*pickMove/);
  });

  it('Test 9: phase=battleOver + continue still throws (battleOver has no legal actions)', () => {
    const state = makeState('battleOver');
    const rng = createRng(1);
    expect(() =>
      reducer(state, { type: 'continue' }, rng, { typeChart: STUB_CHART }),
    ).toThrow(/illegal action/i);
  });
});
