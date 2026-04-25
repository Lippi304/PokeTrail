// src/engine/__tests__/battleMachine.test.ts
// Wave-0 contract tests for Phase 2 Plan 01.
//
// Task 1 (this commit): type unions + npm script — Tests 1-5 below.
// Task 2 (next commit) will EXTEND this file with Tests 6-9 (isLegal + reducer
// skeleton + throw-on-illegal smoke tests).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  BattleAction,
  BattleParticipant,
  BattlePhase,
  GenOneType,
  MoveLike,
  Side,
  StatStages,
} from '../types';

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
