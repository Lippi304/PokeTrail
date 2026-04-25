// src/engine/damage.ts
// Modern Gen-1 damage formula with locked overrides per CONTEXT.md:
//   D-07: crit flat ~1/24 chance, ×1.5
//   D-08: per-move physical/special via damage_class
//   D-09: min-damage 1
//   D-10: STAB ×1.5, random factor 85–100%
//
// Multiplier order (per Bulbapedia "Damage" article + RESEARCH.md):
//   base -> crit -> STAB -> type -> random -> floor at 1
//
// RNG consumption order (load-bearing for save/replay determinism):
//   1) rng.chance(1/24)  — crit roll
//   2) rng.next()         — random factor
// Status moves and full type-immunity short-circuit BEFORE any RNG consumption.
import type { RNG } from './rng';
import type { Combatant, MoveLike } from './types';

export interface DamageContext {
  attacker: Combatant;
  defender: Combatant;
  move: MoveLike;
  /** Pre-computed product from getTypeMultiplier (pass 0 for full immunity). */
  typeMultiplier: number;
  rng: RNG;
}

export interface DamageResult {
  damage: number;
  crit: boolean;
  effectiveness: number;
}

export function calculateDamage(ctx: DamageContext): DamageResult {
  const { attacker, defender, move, typeMultiplier, rng } = ctx;

  // Status moves: bypass damage path entirely (no RNG consumption).
  if (move.damageClass === 'status' || move.power === null) {
    return { damage: 0, crit: false, effectiveness: typeMultiplier };
  }

  // Type immunity: short-circuit (no RNG consumption).
  if (typeMultiplier === 0) {
    return { damage: 0, crit: false, effectiveness: 0 };
  }

  // D-08: pick attack/defense by damage class.
  const A = move.damageClass === 'physical' ? attacker.attack : attacker.spAttack;
  const D = move.damageClass === 'physical' ? defender.defense : defender.spDefense;

  // Bulbapedia base-damage formula.
  const base =
    Math.floor(
      Math.floor(((Math.floor((2 * attacker.level) / 5) + 2) * move.power * A) / D) / 50,
    ) + 2;

  // D-07: crit ~1/24 chance, ×1.5 multiplier. RNG step 1.
  const crit = rng.chance(1 / 24);
  const critMult = crit ? 1.5 : 1;

  // D-10: STAB ×1.5 if move type matches an attacker type.
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;

  // D-10: random factor 85%–100%. RNG step 2.
  const randMult = 0.85 + rng.next() * 0.15;

  const raw = base * critMult * stab * typeMultiplier * randMult;

  // D-09: min-damage 1 (only for non-status, non-immune; immunity already returned 0).
  const damage = Math.max(1, Math.floor(raw));

  return { damage, crit, effectiveness: typeMultiplier };
}
