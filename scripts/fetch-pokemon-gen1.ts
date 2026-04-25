// scripts/fetch-pokemon-gen1.ts
// Run: npm run fetch:data
// Produces:
//   src/data/pokemon-gen1.json   (151 entries, slim shape)
//   src/data/moves-gen1.json     (all Gen-1 red-blue moves, slim shape)
//   src/data/typeChart.json      (15×15 modern chart per D-06)
//   public/sprites/{id}.png      (151 pixel sprites)
//
// Idempotent: skips already-downloaded sprites; re-fetches JSON every run.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { z } from 'zod';
import {
  PokeApiPokemonRawSchema,
  PokeApiMoveRawSchema,
  PokeApiTypeRawSchema,
  PokemonArraySchema,
  MoveArraySchema,
  TypeChartSchema,
  GEN1_TYPES,
  type Pokemon,
  type Move,
  type TypeName,
  type DamageClass,
} from '../src/data/schemas';

const POKEAPI = 'https://pokeapi.co/api/v2';
const SPRITE_DIR = 'public/sprites';
const DATA_DIR = 'src/data';
const USER_AGENT = 'poketrail-build (https://github.com/lippi304/PokeTrail)';

async function fetchJson<T>(url: string, schema: z.ZodType<T>, attempts = 3): Promise<T> {
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) return schema.parse(await res.json());
      if (res.status === 429 || res.status >= 500) {
        const wait = 500 * Math.pow(2, i);
        console.warn(`${url} → ${res.status}; retrying in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw new Error(`${url} → ${res.status}`);
    } catch (e) {
      lastErr = e;
      const wait = 500 * Math.pow(2, i);
      console.warn(`${url} → error ${(e as Error).message}; retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(
    `${url}: gave up after ${attempts} attempts: ${(lastErr as Error)?.message ?? 'unknown'}`,
  );
}

async function pmap<T, R>(items: readonly T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  const queue = items.slice();
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) {
        const item = queue.shift();
        if (item === undefined) return;
        out.push(await fn(item));
      }
    }),
  );
  return out;
}

function isGen1Type(name: string): name is TypeName {
  return (GEN1_TYPES as readonly string[]).includes(name);
}

function isDamageClass(name: string): name is DamageClass {
  return name === 'physical' || name === 'special' || name === 'status';
}

async function main(): Promise<void> {
  mkdirSync(SPRITE_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });

  // 1. Fetch all 151 Pokémon
  const ids = Array.from({ length: 151 }, (_, i) => i + 1);
  console.log(`Fetching 151 Pokémon...`);
  const rawPokemon = await pmap(ids, 10, (id) =>
    fetchJson(`${POKEAPI}/pokemon/${id}`, PokeApiPokemonRawSchema),
  );
  // Sort by id so output is stable
  rawPokemon.sort((a, b) => a.id - b.id);

  // 2. Collect referenced Gen-1 red-blue moves
  const moveNames = new Set<string>();
  for (const p of rawPokemon) {
    for (const m of p.moves) {
      if (m.version_group_details.some((d) => d.version_group.name === 'red-blue')) {
        moveNames.add(m.move.name);
      }
    }
  }
  console.log(`Fetching ${moveNames.size} moves...`);
  const rawMoves = await pmap([...moveNames].sort(), 10, (name) =>
    fetchJson(`${POKEAPI}/move/${name}`, PokeApiMoveRawSchema),
  );

  // Filter moves whose type is not in the 15-type set (modern chart per D-06)
  const filteredOutMoves: { name: string; type: string }[] = [];
  const movesOut: Move[] = [];
  for (const m of rawMoves) {
    if (!isGen1Type(m.type.name)) {
      filteredOutMoves.push({ name: m.name, type: m.type.name });
      continue;
    }
    if (!isDamageClass(m.damage_class.name)) {
      throw new Error(`Move ${m.name} has unknown damage_class: ${m.damage_class.name}`);
    }
    movesOut.push({
      id: m.id,
      name: m.name,
      type: m.type.name,
      power: m.power,
      pp: m.pp,
      accuracy: m.accuracy,
      priority: m.priority,
      damageClass: m.damage_class.name,
    });
  }
  movesOut.sort((a, b) => a.id - b.id);

  // 3. Fetch the 15 Gen-1 types
  console.log(`Fetching 15 types...`);
  const rawTypes = await pmap([...GEN1_TYPES], 5, (name) =>
    fetchJson(`${POKEAPI}/type/${name}`, PokeApiTypeRawSchema),
  );

  // 4. Derive type chart (D-06)
  type TypeRow = Record<TypeName, 0 | 0.5 | 1 | 2>;
  const typeChart: Record<TypeName, TypeRow> = {} as Record<TypeName, TypeRow>;
  for (const t of rawTypes) {
    if (!isGen1Type(t.name)) throw new Error(`Unexpected type from PokéAPI: ${t.name}`);
    const row: TypeRow = {} as TypeRow;
    for (const d of GEN1_TYPES) row[d] = 1;
    for (const x of t.damage_relations.double_damage_to) {
      if (isGen1Type(x.name)) row[x.name] = 2;
    }
    for (const x of t.damage_relations.half_damage_to) {
      if (isGen1Type(x.name)) row[x.name] = 0.5;
    }
    for (const x of t.damage_relations.no_damage_to) {
      if (isGen1Type(x.name)) row[x.name] = 0;
    }
    typeChart[t.name] = row;
  }
  TypeChartSchema.parse(typeChart); // assert before write

  // 5. Download sprites (D-02: pixel only — red-blue → fallback yellow)
  console.log(`Downloading sprites...`);
  await pmap(rawPokemon, 10, async (p) => {
    const url =
      p.sprites.versions['generation-i']['red-blue'].front_default ??
      p.sprites.versions['generation-i'].yellow.front_default;
    const path = `${SPRITE_DIR}/${p.id}.png`;
    if (existsSync(path)) return; // idempotent
    if (!url) {
      console.warn(`No Gen-1 sprite for #${p.id} ${p.name} — skipping`);
      return;
    }
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`sprite ${url} → ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(path, buf);
  });

  // 6. Project to slim game shape and validate
  const pokemonOut: Pokemon[] = rawPokemon.map((p) => {
    // For Pokémon retconned to Steel/Dark/Fairy in later gens (e.g. Clefairy → Fairy),
    // PokéAPI exposes the pre-retcon typing under `past_types[generation: generation-v]`
    // (Gen-V is the last generation BEFORE Fairy was introduced in Gen-VI).
    // D-06 mandates the Gen-1 type chart minus Steel/Dark/Fairy, so we prefer past_types
    // when current types contain any non-Gen-1 type.
    const currentTypeNames = p.types.map((t) => t.type.name);
    const hasRetcon = currentTypeNames.some((n) => !isGen1Type(n));
    let types: TypeName[];
    if (hasRetcon) {
      const pastTypes = p.past_types ?? [];
      const pastEntry =
        pastTypes.find((pt) => pt.generation.name === 'generation-v') ??
        pastTypes.find((pt) => pt.generation.name === 'generation-i') ??
        pastTypes[0];
      if (!pastEntry) {
        throw new Error(
          `#${p.id} ${p.name} has retconned type(s) ${currentTypeNames.join(',')} but no past_types entry`,
        );
      }
      types = pastEntry.types.map((t) => t.type.name).filter(isGen1Type);
      console.log(
        `Using past_types for #${p.id} ${p.name}: ${currentTypeNames.join(',')} → ${types.join(',')}`,
      );
    } else {
      types = currentTypeNames.filter(isGen1Type);
    }
    if (types.length === 0) throw new Error(`#${p.id} ${p.name} has no Gen-1-valid type`);

    const findStat = (name: string): number => {
      const stat = p.stats.find((s) => s.stat.name === name);
      if (!stat) throw new Error(`#${p.id} ${p.name}: missing stat ${name}`);
      return stat.base_stat;
    };

    const baseStats = {
      hp: findStat('hp'),
      attack: findStat('attack'),
      defense: findStat('defense'),
      'special-attack': findStat('special-attack'),
      'special-defense': findStat('special-defense'),
      speed: findStat('speed'),
    };

    const levelUpMoves = p.moves
      .map((m) => {
        const detail = m.version_group_details.find(
          (d) => d.version_group.name === 'red-blue' && d.move_learn_method.name === 'level-up',
        );
        if (!detail) return null;
        return { name: m.move.name, level: detail.level_learned_at };
      })
      .filter((m): m is { name: string; level: number } => m !== null)
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

    return {
      id: p.id,
      name: p.name,
      types,
      baseStats,
      sprite: `/sprites/${p.id}.png`,
      levelUpMoves,
    };
  });

  PokemonArraySchema.parse(pokemonOut); // build-time fail-loud
  MoveArraySchema.parse(movesOut);

  // 7. Write
  writeFileSync(`${DATA_DIR}/pokemon-gen1.json`, JSON.stringify(pokemonOut, null, 2));
  writeFileSync(`${DATA_DIR}/moves-gen1.json`, JSON.stringify(movesOut, null, 2));
  writeFileSync(`${DATA_DIR}/typeChart.json`, JSON.stringify(typeChart, null, 2));

  console.log(
    `Wrote ${pokemonOut.length} Pokémon, ${movesOut.length} moves, ${Object.keys(typeChart).length} types.`,
  );
  if (filteredOutMoves.length > 0) {
    console.log(
      `Filtered out ${filteredOutMoves.length} moves with non-Gen-1 types: ${filteredOutMoves
        .map((m) => `${m.name}(${m.type})`)
        .join(', ')}`,
    );
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
