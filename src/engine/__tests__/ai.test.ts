// src/engine/__tests__/ai.test.ts
// Phase-2 AI tests — D-25 / AI-01 / Pitfall 6.
// Locks: random strategy returns 0..N-1; deterministic; consumes EXACTLY
// 1 RNG step per call; unknown strategy throws via assertNever.

import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { selectMove } from '../ai';
import type { AiStrategy } from '../ai';
import {
  makeBulbasaur,
  makeCharmander,
  makeInitialBattleState,
  makeMove,
} from './battle-fixtures';
import type { BattleState, MoveIndex } from '../types';

function stateWithEnemyMoveCount(n: 1 | 2 | 3 | 4): BattleState {
  const moves = Array.from({ length: n }, (_, i) =>
    makeMove({
      name: `Filler${i}`,
      type: 'normal',
      power: 40,
      damageClass: 'physical',
    }),
  );
  return makeInitialBattleState({
    player: makeCharmander(),
    enemy: makeBulbasaur({ moves }),
  });
}

describe('selectMove (AI) — Phase 2 random strategy', () => {
  it('A1: returns a legal index in 0..moves.length-1', () => {
    const state4 = stateWithEnemyMoveCount(4);
    const rng4 = createRng(0xa1);
    const idx4 = selectMove(state4, rng4, 'random');
    expect(idx4).toBeGreaterThanOrEqual(0);
    expect(idx4).toBeLessThanOrEqual(3);

    const state1 = stateWithEnemyMoveCount(1);
    const rng1 = createRng(0xa1);
    const idx1: MoveIndex = selectMove(state1, rng1, 'random');
    expect(idx1).toBe(0);
  });

  it('A2: deterministic — same seed + same state → same index', () => {
    const stateA = stateWithEnemyMoveCount(4);
    const stateB = stateWithEnemyMoveCount(4);
    const rngA = createRng(0xdead);
    const rngB = createRng(0xdead);
    expect(selectMove(stateA, rngA, 'random')).toBe(
      selectMove(stateB, rngB, 'random'),
    );
  });

  it('A3: deterministic across player-state mutation (random does not branch on player)', () => {
    const seed = 0xbeef;
    const original = stateWithEnemyMoveCount(4);
    const rng1 = createRng(seed);
    const idx1 = selectMove(original, rng1, 'random');

    const mutated: BattleState = {
      ...original,
      combatants: {
        player: { ...original.combatants.player, hp: 1 },
        enemy: original.combatants.enemy,
      },
    };
    const rng2 = createRng(seed);
    const idx2 = selectMove(mutated, rng2, 'random');
    expect(idx2).toBe(idx1);
  });

  it('A4: consumes EXACTLY 1 RNG step per call (Pitfall 6)', () => {
    const state = stateWithEnemyMoveCount(4);
    const rng = createRng(0xc0ffee);
    expect(rng.counter).toBe(0);
    selectMove(state, rng, 'random');
    expect(rng.counter).toBe(1);
    for (let i = 2; i <= 5; i++) {
      selectMove(state, rng, 'random');
      expect(rng.counter).toBe(i);
    }
  });

  it('A4b: even with moves.length === 1, 1 RNG step is consumed (replay-safety)', () => {
    const state = stateWithEnemyMoveCount(1);
    const rng = createRng(0xfeed);
    selectMove(state, rng, 'random');
    expect(rng.counter).toBe(1);
  });

  it('A5: unknown strategy throws via assertNever', () => {
    const state = stateWithEnemyMoveCount(4);
    const rng = createRng(1);
    expect(() =>
      selectMove(state, rng, 'gymPriority' as unknown as AiStrategy),
    ).toThrow(/unknown ai strategy/i);
  });

  it('A6: enemy with zero moves throws explicit error', () => {
    const state = makeInitialBattleState({
      player: makeCharmander(),
      enemy: makeBulbasaur({ moves: [] }),
    });
    const rng = createRng(1);
    expect(() => selectMove(state, rng, 'random')).toThrow(/no moves/i);
  });
});
