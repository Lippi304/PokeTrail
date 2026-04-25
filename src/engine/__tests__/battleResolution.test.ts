// src/engine/__tests__/battleResolution.test.ts
// D-23 lock: priority → speed → RNG-tiebreak. Pitfall 4 lock: rng.chance(0.5)
// is consumed ONLY on speed-tie, never otherwise.

import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { resolveOrder } from '../battleResolution';
import { makeMove } from './battle-fixtures';

describe('resolveOrder (D-23, Pitfall 4)', () => {
  it('R1: higher priority wins regardless of speed; consumes 0 RNG', () => {
    const quickAttack = makeMove({
      name: 'Quick Attack',
      type: 'normal',
      power: 40,
      damageClass: 'physical',
      priority: 1,
    });
    const tackle = makeMove({
      name: 'Tackle',
      type: 'normal',
      power: 40,
      damageClass: 'physical',
      priority: 0,
    });
    const rng = createRng(1);
    const order = resolveOrder(quickAttack, tackle, 10, 99, rng);
    expect(order).toEqual(['player', 'enemy']);
    expect(rng.counter).toBe(0);

    // Inverse: enemy has priority, player is faster.
    const rng2 = createRng(1);
    const order2 = resolveOrder(tackle, quickAttack, 99, 10, rng2);
    expect(order2).toEqual(['enemy', 'player']);
    expect(rng2.counter).toBe(0);
  });

  it('R2: equal priority, higher speed wins; consumes 0 RNG', () => {
    const tackle = makeMove({
      name: 'Tackle',
      type: 'normal',
      power: 40,
      damageClass: 'physical',
    });
    const rng = createRng(2);
    const order = resolveOrder(tackle, tackle, 99, 50, rng);
    expect(order).toEqual(['player', 'enemy']);
    expect(rng.counter).toBe(0);

    const rng2 = createRng(2);
    const order2 = resolveOrder(tackle, tackle, 50, 99, rng2);
    expect(order2).toEqual(['enemy', 'player']);
    expect(rng2.counter).toBe(0);
  });

  it('R3: speed tie consumes EXACTLY 1 RNG step + deterministic', () => {
    const tackle = makeMove({
      name: 'Tackle',
      type: 'normal',
      power: 40,
      damageClass: 'physical',
    });
    const rngA = createRng(0x1234);
    const orderA = resolveOrder(tackle, tackle, 50, 50, rngA);
    expect(rngA.counter).toBe(1);

    const rngB = createRng(0x1234);
    const orderB = resolveOrder(tackle, tackle, 50, 50, rngB);
    expect(orderB).toEqual(orderA);
    expect(rngB.counter).toBe(1);

    // Both possible outcomes are valid orders.
    expect(
      orderA[0] === 'player' || orderA[0] === 'enemy',
    ).toBe(true);
  });

  it('R4: missing priority defaults to 0 — speed decides', () => {
    const a: Parameters<typeof resolveOrder>[0] = {
      power: 40,
      type: 'normal',
      damageClass: 'physical',
    };
    const b: Parameters<typeof resolveOrder>[1] = {
      power: 40,
      type: 'normal',
      damageClass: 'physical',
    };
    const rng = createRng(3);
    const order = resolveOrder(a, b, 10, 99, rng);
    expect(order).toEqual(['enemy', 'player']);
    expect(rng.counter).toBe(0);
  });
});
