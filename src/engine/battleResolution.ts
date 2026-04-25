// src/engine/battleResolution.ts
// Turn-order resolution per D-23 (modern Smogon convention):
//   priority → speed → RNG-tiebreak (only on speed tie).
//
// RNG consumption lock (Pitfall 4 from 02-RESEARCH): rng.chance(0.5) is called
// ONLY when speeds are equal. Asserted by tests via counter-delta.
//
// Engine-pure: no react, no Math.random, no Date.now, no src/data/** imports.
import type { RNG } from './rng';
import type { MoveLike, Side } from './types';

export type Order = readonly [Side, Side];

export function resolveOrder(
  playerMove: MoveLike,
  enemyMove: MoveLike,
  playerSpeed: number,
  enemySpeed: number,
  rng: RNG,
): Order {
  const pPrio = playerMove.priority ?? 0;
  const ePrio = enemyMove.priority ?? 0;
  if (pPrio > ePrio) return ['player', 'enemy'] as const;
  if (ePrio > pPrio) return ['enemy', 'player'] as const;
  if (playerSpeed > enemySpeed) return ['player', 'enemy'] as const;
  if (enemySpeed > playerSpeed) return ['enemy', 'player'] as const;
  // Speed tie — ONLY now consume RNG (Pitfall 4).
  return rng.chance(0.5)
    ? (['player', 'enemy'] as const)
    : (['enemy', 'player'] as const);
}
