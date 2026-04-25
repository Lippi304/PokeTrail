// src/engine/rng.ts
// Seedable mulberry32 PRNG with a counter (ENG-01).
// mulberry32 reference: Tommy Ettinger, public domain.
// Engine-pure: no react, no Math.random, no Date.now, no new Date.

export interface RNG {
  /** Returns a deterministic float in [0, 1) and advances the counter. */
  next(): number;
  /** Returns a deterministic int in [min, max] inclusive and advances the counter. */
  nextInt(min: number, max: number): number;
  /** Returns true with probability p (consumes one next() call). */
  chance(p: number): boolean;
  /** Number of next() calls made since seed (used for save replay). */
  readonly counter: number;
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number, startCounter = 0): RNG {
  const base = mulberry32(seed);
  // Burn `startCounter` values to align with the position of a previously-saved RNG.
  for (let i = 0; i < startCounter; i++) base();
  let counter = startCounter;

  const api: RNG = {
    next() {
      counter++;
      return base();
    },
    nextInt(min: number, max: number) {
      return min + Math.floor(api.next() * (max - min + 1));
    },
    chance(p: number) {
      return api.next() < p;
    },
    get counter() {
      return counter;
    },
  };
  return api;
}
