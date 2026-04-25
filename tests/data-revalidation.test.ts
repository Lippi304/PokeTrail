import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PokemonArraySchema, MoveArraySchema, TypeChartSchema } from '../src/data/schemas';

describe('module-init re-validation (DATA-05, D-19)', () => {
  it('importing src/data/index.ts loads and validates the committed JSON without throwing', async () => {
    // dynamic import so this test runs the parse() chain at import time
    const mod = await import('../src/data/index');
    expect(mod.POKEMON).toHaveLength(151);
    expect(Object.keys(mod.TYPE_CHART)).toHaveLength(15);
    expect(mod.MOVES.length).toBeGreaterThan(0);
  });

  it('PokemonArraySchema rejects a fixture with missing required fields (safeParse + parse both fail)', () => {
    const bad: unknown = JSON.parse(readFileSync('tests/fixtures/bad-pokemon.json', 'utf-8'));
    expect(PokemonArraySchema.safeParse(bad).success).toBe(false);
    // parse() (the form used at module-init in src/data/index.ts) MUST throw.
    expect(() => PokemonArraySchema.parse(bad)).toThrow();
  });

  it('TypeChartSchema rejects a fixture containing non-Gen-1 types (steel) — parse() throws', () => {
    const bad: unknown = JSON.parse(readFileSync('tests/fixtures/bad-typechart.json', 'utf-8'));
    expect(TypeChartSchema.safeParse(bad).success).toBe(false);
    expect(() => TypeChartSchema.parse(bad)).toThrow();
  });

  it('committed pokemon-gen1.json contains exactly 151 entries with no Steel/Dark/Fairy types (D-06)', () => {
    const raw: unknown = JSON.parse(readFileSync('src/data/pokemon-gen1.json', 'utf-8'));
    const parsed = PokemonArraySchema.parse(raw);
    expect(parsed).toHaveLength(151);
    for (const p of parsed) {
      for (const t of p.types) {
        expect(['steel', 'dark', 'fairy']).not.toContain(t);
      }
    }
  });

  it('committed typeChart.json has exactly 15 types and no Steel/Dark/Fairy (D-06)', () => {
    const raw: unknown = JSON.parse(readFileSync('src/data/typeChart.json', 'utf-8'));
    const parsed = TypeChartSchema.parse(raw);
    const keys = Object.keys(parsed);
    expect(keys).toHaveLength(15);
    expect(keys).not.toContain('steel');
    expect(keys).not.toContain('dark');
    expect(keys).not.toContain('fairy');
  });

  it('Psychic vs Ghost is 1× in modern chart (D-06: Gen-1 0× bug removed, not super-effective)', () => {
    // Note: PokéAPI's modern damage_relations puts Psychic→Ghost back to 1× (neutral),
    // not 2×. The Gen-1 bug was that Psychic-vs-Ghost was 0×; modern fixes that to
    // neutral. The asymmetric Ghost→Psychic = 2× is verified separately below.
    const raw: unknown = JSON.parse(readFileSync('src/data/typeChart.json', 'utf-8'));
    const parsed = TypeChartSchema.parse(raw);
    expect(parsed.psychic?.ghost).toBe(1);
  });

  it('Ghost vs Psychic is 2× in modern chart (D-06: super-effective per modern type-chart)', () => {
    const raw: unknown = JSON.parse(readFileSync('src/data/typeChart.json', 'utf-8'));
    const parsed = TypeChartSchema.parse(raw);
    expect(parsed.ghost?.psychic).toBe(2);
  });

  it('Ghost vs Normal is 0× and Normal vs Ghost is 0× (modern + Gen-1 agree)', () => {
    const raw: unknown = JSON.parse(readFileSync('src/data/typeChart.json', 'utf-8'));
    const parsed = TypeChartSchema.parse(raw);
    expect(parsed.ghost?.normal).toBe(0);
    expect(parsed.normal?.ghost).toBe(0);
  });

  it('Electric vs Ground is 0× (immunity)', () => {
    const raw: unknown = JSON.parse(readFileSync('src/data/typeChart.json', 'utf-8'));
    const parsed = TypeChartSchema.parse(raw);
    expect(parsed.electric?.ground).toBe(0);
  });

  it('committed moves include damage_class field (D-08)', () => {
    const raw: unknown = JSON.parse(readFileSync('src/data/moves-gen1.json', 'utf-8'));
    const parsed = MoveArraySchema.parse(raw);
    expect(parsed.length).toBeGreaterThan(50);
    for (const m of parsed) {
      expect(['physical', 'special', 'status']).toContain(m.damageClass);
    }
  });
});
