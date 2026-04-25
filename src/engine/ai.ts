// src/engine/ai.ts
// AI move selection. Strategy-pattern per D-25 (Phase 8 will add 'gymPriority',
// 'gymPrioritySwitch', etc.). Engine-pure: no react, no Math.random,
// no Date.now, no src/data/** imports.
//
// RNG consumption lock (Pitfall 6 from 02-RESEARCH): exactly ONE rng step per
// call, even when only a single legal move exists. `nextInt(0, 0)` still calls
// `next()` once → counter += 1. Tests assert this so save/replay determinism
// can't drift between "1 move" and "4 move" battles.
import type { RNG } from './rng';
import type { BattleState, MoveIndex } from './types';

export type AiStrategy = 'random'; // Phase 8: | 'gymPriority' | 'gymPrioritySwitch'

export function selectMove(
  state: BattleState,
  rng: RNG,
  strategy: AiStrategy,
): MoveIndex {
  switch (strategy) {
    case 'random': {
      const moves = state.combatants.enemy.moves;
      if (moves.length === 0) {
        throw new Error('selectMove: enemy has no moves');
      }
      const idx = rng.nextInt(0, moves.length - 1);
      // moves.length is bounded to 1..4 by the BattleParticipant invariant,
      // so the cast to MoveIndex is safe.
      return idx as MoveIndex;
    }
    default: {
      const _exhaustive: never = strategy;
      throw new Error(`Unknown AI strategy: ${String(_exhaustive)}`);
    }
  }
}
