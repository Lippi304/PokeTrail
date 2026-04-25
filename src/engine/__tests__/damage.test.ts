import { describe, expect, it } from 'vitest';
import { calculateDamage } from '../damage';
import type { RNG } from '../rng';
import { GOLDEN_CASES } from './golden-baseline';

/**
 * Scripted RNG: returns scripted values in order via next(); throws if exhausted.
 * `chance(p)` consumes one next() call. nextInt is unused by damage.ts.
 */
function scriptedRng(values: readonly number[]): RNG {
  let i = 0;
  return {
    next() {
      if (i >= values.length) {
        throw new Error(`RNG script exhausted at index ${i}`);
      }
      const v = values[i++];
      if (v === undefined) throw new Error(`RNG script slot ${i - 1} undefined`);
      return v;
    },
    nextInt() {
      return 0;
    },
    chance(p: number) {
      return this.next() < p;
    },
    get counter() {
      return i;
    },
  };
}

describe('damage formula (ENG-03 / ENG-04 golden table)', () => {
  it.each(GOLDEN_CASES)('$id: $description', (gc) => {
    const result = calculateDamage({
      attacker: gc.attacker,
      defender: gc.defender,
      move: gc.move,
      typeMultiplier: gc.typeMultiplier,
      rng: scriptedRng(gc.rngScript),
    });
    expect(result.damage).toBe(gc.expect.damage);
    expect(result.crit).toBe(gc.expect.crit);
    expect(result.effectiveness).toBe(gc.expect.effectiveness);
  });

  it('G17: random factor low bound = 0.85 of base (re-asserts G1-low deterministically)', () => {
    const g1Low = GOLDEN_CASES.find((c) => c.id === 'G1-low');
    if (!g1Low) throw new Error('G1-low golden case missing');
    const result = calculateDamage({
      attacker: g1Low.attacker,
      defender: g1Low.defender,
      move: g1Low.move,
      typeMultiplier: g1Low.typeMultiplier,
      rng: scriptedRng([1.0, 0.0]),
    });
    expect(result.damage).toBe(g1Low.expect.damage);
  });

  it('G18: random factor high bound ≈ 1.00 of base (re-asserts G1-high)', () => {
    const g1High = GOLDEN_CASES.find((c) => c.id === 'G1-high');
    if (!g1High) throw new Error('G1-high golden case missing');
    const result = calculateDamage({
      attacker: g1High.attacker,
      defender: g1High.defender,
      move: g1High.move,
      typeMultiplier: g1High.typeMultiplier,
      rng: scriptedRng([1.0, 0.9999]),
    });
    expect(result.damage).toBe(g1High.expect.damage);
  });
});
