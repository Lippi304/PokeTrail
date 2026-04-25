import { describe, expect, it } from 'vitest';
import { getTypeMultiplier } from '../typeChart';
import type { GenOneType, TypeChart, TypeMultiplier } from '../types';
import { GEN_ONE_TYPES } from '../types';

// Hand-built fixture chart — defaults all matchups to 1 (neutral) and overrides
// only the cells we assert against. getTypeMultiplier MUST throw on missing /
// unknown rather than defaulting silently.
function makeFixture(
  overrides: ReadonlyArray<readonly [GenOneType, GenOneType, TypeMultiplier]>,
): TypeChart {
  const chart = {} as TypeChart;
  for (const a of GEN_ONE_TYPES) {
    chart[a] = {} as TypeChart[GenOneType];
    for (const b of GEN_ONE_TYPES) {
      chart[a][b] = 1;
    }
  }
  for (const [a, b, v] of overrides) {
    chart[a][b] = v;
  }
  return chart;
}

const CHART: TypeChart = makeFixture([
  // Single-type cells (mirrors PokéAPI damage_relations for D-06)
  ['water', 'fire', 2],
  ['fire', 'water', 0.5],
  ['fire', 'grass', 2],
  ['grass', 'water', 2],
  ['water', 'grass', 0.5],
  ['electric', 'water', 2],
  ['electric', 'flying', 2],
  ['electric', 'ground', 0],
  ['ground', 'electric', 2],
  ['ground', 'fire', 2],
  ['ground', 'flying', 0],
  ['rock', 'flying', 2],
  ['rock', 'fire', 2],
  ['fighting', 'normal', 2],
  ['fighting', 'rock', 2],
  ['fighting', 'ghost', 0],
  ['ghost', 'normal', 0],
  ['normal', 'ghost', 0],
  ['ghost', 'psychic', 2],
  ['psychic', 'ghost', 2], // D-06: modern, NOT Gen-1 0× bug
  ['psychic', 'fighting', 2],
  ['psychic', 'poison', 2],
  ['psychic', 'psychic', 0.5],
  ['bug', 'grass', 2],
  ['bug', 'flying', 0.5],
  ['bug', 'fire', 0.5],
  ['bug', 'poison', 0.5],
  ['ice', 'flying', 2],
  ['ice', 'ground', 2],
  ['ice', 'dragon', 2],
  ['dragon', 'dragon', 2],
  ['poison', 'grass', 2],
  ['poison', 'rock', 0.5],
  ['poison', 'ground', 0.5],
]);

describe('typeChart single-type matchups (ENG-02, D-06)', () => {
  it.each<readonly [GenOneType, readonly GenOneType[], number]>([
    ['water', ['fire'], 2],
    ['fire', ['water'], 0.5],
    ['electric', ['ground'], 0],
    ['normal', ['ghost'], 0],
    ['ghost', ['normal'], 0],
    ['psychic', ['ghost'], 2], // modern (D-06 — NOT Gen-1 bug)
    ['ghost', ['psychic'], 2],
    ['fighting', ['ghost'], 0],
    ['fire', ['grass'], 2],
    ['grass', ['water'], 2],
    ['ice', ['dragon'], 2],
    ['psychic', ['psychic'], 0.5],
  ])('%s vs %j → %s', (move, def, expected) => {
    expect(getTypeMultiplier(move, def, CHART)).toBe(expected);
  });
});

describe('typeChart dual-type matchups stack multiplicatively', () => {
  it.each<readonly [GenOneType, readonly GenOneType[], number]>([
    ['water', ['rock', 'ground'], 4],
    ['electric', ['water', 'flying'], 4],
    ['fire', ['grass', 'poison'], 2], // 2 * 1
    ['grass', ['water', 'ground'], 4], // 2 * 2
    ['bug', ['grass', 'flying'], 1], // 2 * 0.5
    ['bug', ['grass', 'poison'], 1], // 2 * 0.5
    ['ice', ['flying', 'ground'], 4],
    ['psychic', ['ghost', 'poison'], 4], // 2 * 2 — D-06
    ['fighting', ['rock', 'flying'], 1], // 2 * 0.5
    ['ground', ['flying', 'fire'], 0], // 0 dominates
    ['poison', ['grass', 'rock'], 1], // 2 * 0.5
    ['water', ['grass', 'rock'], 1], // 0.5 * 2
  ])('%s vs %j → %s', (move, def, expected) => {
    expect(getTypeMultiplier(move, def, CHART)).toBe(expected);
  });
});

describe('typeChart guards against invalid input', () => {
  it('throws on unknown move type', () => {
    expect(() =>
      // @ts-expect-error invalid type intentionally
      getTypeMultiplier('fairy', ['normal'], CHART),
    ).toThrow();
  });
  it('throws on unknown defender type', () => {
    expect(() =>
      // @ts-expect-error invalid type intentionally
      getTypeMultiplier('fire', ['steel'], CHART),
    ).toThrow();
  });
  it('throws when one of two defender types is unknown', () => {
    expect(() =>
      // @ts-expect-error invalid type intentionally
      getTypeMultiplier('fire', ['grass', 'fairy'], CHART),
    ).toThrow();
  });
});
