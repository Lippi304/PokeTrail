// src/engine/accuracy.ts
// Accuracy roll with the 70% floor (D-09) — anti-frustration for short
// roguelike runs. Null move accuracy = always-hit (Swift, etc.).
import type { RNG } from './rng';

export const ACCURACY_FLOOR = 0.7 as const;

/**
 * Rolls the move's accuracy against the RNG.
 * - `null` accuracy → always returns true (always-hit moves).
 * - Otherwise: clamps the effective accuracy to >= ACCURACY_FLOOR (0.7),
 *   then succeeds iff `rng.next() < effective`.
 */
export function rollAccuracy(moveAccuracy: number | null, rng: RNG): boolean {
  if (moveAccuracy === null) return true;
  const effective = Math.max(ACCURACY_FLOOR, moveAccuracy / 100);
  return rng.next() < effective;
}
