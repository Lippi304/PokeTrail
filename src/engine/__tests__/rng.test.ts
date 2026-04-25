import { describe, expect, it } from 'vitest';
import { createRng, mulberry32 } from '../rng';

describe('rng (ENG-01)', () => {
  it('mulberry32 is deterministic across re-instantiations (G23)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('createRng counter starts at 0 and increments per next() (G24)', () => {
    const rng = createRng(42);
    expect(rng.counter).toBe(0);
    rng.next();
    expect(rng.counter).toBe(1);
    rng.next();
    expect(rng.counter).toBe(2);
  });

  it('createRng with startCounter replays past N values (G24)', () => {
    const fresh = createRng(42);
    for (let i = 0; i < 50; i++) fresh.next();
    const valueAt50 = fresh.next(); // counter is now 51
    expect(fresh.counter).toBe(51);

    const replayed = createRng(42, 50);
    const replayedValue = replayed.next();
    expect(replayedValue).toBe(valueAt50);
    expect(replayed.counter).toBe(51);
  });

  it('nextInt is in [min, max] inclusive and integer', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextInt(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('nextInt distribution is roughly uniform across [1,6]', () => {
    const rng = createRng(99);
    const buckets = [0, 0, 0, 0, 0, 0];
    const N = 60_000;
    for (let i = 0; i < N; i++) {
      const v = rng.nextInt(1, 6);
      const idx = v - 1;
      const current = buckets[idx];
      if (current === undefined) throw new Error(`out of range: ${v}`);
      buckets[idx] = current + 1;
    }
    const expected = N / 6;
    for (const b of buckets) {
      // each bucket within ±20% of expected
      expect(b).toBeGreaterThan(expected * 0.8);
      expect(b).toBeLessThan(expected * 1.2);
    }
  });

  it('chance(0.5) frequency over 100k trials is ~0.5', () => {
    const rng = createRng(123);
    let hits = 0;
    for (let i = 0; i < 100_000; i++) if (rng.chance(0.5)) hits++;
    const rate = hits / 100_000;
    expect(rate).toBeGreaterThan(0.485);
    expect(rate).toBeLessThan(0.515);
  });

  it('chance(1/24) frequency over 100k trials is ~0.0417 (G22 — flat ~1/24 crit per D-07)', () => {
    const rng = createRng(456);
    let hits = 0;
    for (let i = 0; i < 100_000; i++) if (rng.chance(1 / 24)) hits++;
    const rate = hits / 100_000;
    expect(rate).toBeGreaterThan(0.038);
    expect(rate).toBeLessThan(0.046);
  });
});
