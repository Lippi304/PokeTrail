import { describe, expect, it } from 'vitest';
import { ACCURACY_FLOOR, rollAccuracy } from '../accuracy';
import type { RNG } from '../rng';

function rngStub(value: number): RNG {
  return {
    next: () => value,
    nextInt: () => 0,
    chance: (p: number) => value < p,
    counter: 0,
  };
}

describe('accuracy (ENG-05, D-09 — 70% floor)', () => {
  it('ACCURACY_FLOOR is exactly 0.7', () => {
    expect(ACCURACY_FLOOR).toBe(0.7);
  });

  it('null accuracy always hits (always-hit moves) — G21', () => {
    expect(rollAccuracy(null, rngStub(0.99))).toBe(true);
    expect(rollAccuracy(null, rngStub(0.0))).toBe(true);
    expect(rollAccuracy(null, rngStub(0.999999))).toBe(true);
  });

  it('G19: 50% move at rng=0.69 still hits (70% floor takes effect)', () => {
    expect(rollAccuracy(50, rngStub(0.69))).toBe(true);
  });

  it('G20: 50% move at rng=0.71 misses (above 70% floor)', () => {
    expect(rollAccuracy(50, rngStub(0.71))).toBe(false);
  });

  it('100% move at rng=0.99 hits', () => {
    expect(rollAccuracy(100, rngStub(0.99))).toBe(true);
  });

  it('70% move at rng=0.69 hits, at rng=0.71 misses (boundary)', () => {
    expect(rollAccuracy(70, rngStub(0.69))).toBe(true);
    expect(rollAccuracy(70, rngStub(0.71))).toBe(false);
  });

  it('drop below 70% gets floored: 30% effective accuracy still acts as 70%', () => {
    expect(rollAccuracy(30, rngStub(0.69))).toBe(true);
    expect(rollAccuracy(30, rngStub(0.71))).toBe(false);
  });
});
