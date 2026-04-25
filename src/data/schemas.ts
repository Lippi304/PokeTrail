// src/data/schemas.ts
// Source of truth for runtime validation AND TypeScript types.
// Used by:
//   - scripts/fetch-pokemon-gen1.ts (build-time validation of PokéAPI responses)
//   - src/data/index.ts (module-init re-validation per D-19, DATA-05)
import { z } from 'zod';

// 15 Gen-1 types — Steel/Dark/Fairy excluded per D-06.
export const TypeName = z.enum([
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
]);
export type TypeName = z.infer<typeof TypeName>;
export const GEN1_TYPES = TypeName.options;

// Slim Pokemon shape — what the game actually consumes
export const PokemonSchema = z.object({
  id: z.number().int().min(1).max(151),
  name: z.string().min(1),
  types: z.array(TypeName).min(1).max(2),
  baseStats: z.object({
    hp: z.number().int().min(1),
    attack: z.number().int().min(1),
    defense: z.number().int().min(1),
    'special-attack': z.number().int().min(1),
    'special-defense': z.number().int().min(1),
    speed: z.number().int().min(1),
  }),
  sprite: z.string().regex(/^\/sprites\/\d+\.png$/),
  levelUpMoves: z.array(
    z.object({
      name: z.string().min(1),
      level: z.number().int().min(0).max(100),
    }),
  ),
});
export type Pokemon = z.infer<typeof PokemonSchema>;
export const PokemonArraySchema = z.array(PokemonSchema).length(151);

export const DamageClass = z.enum(['physical', 'special', 'status']); // D-08
export type DamageClass = z.infer<typeof DamageClass>;

export const MoveSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  type: TypeName,
  power: z.number().int().nullable(),
  pp: z.number().int().nullable(),
  accuracy: z.number().int().nullable(),
  priority: z.number().int(),
  damageClass: DamageClass,
});
export type Move = z.infer<typeof MoveSchema>;
export const MoveArraySchema = z.array(MoveSchema);

const TypeMultiplier = z.union([
  z.literal(0),
  z.literal(0.5),
  z.literal(1),
  z.literal(2),
]);
export type TypeMultiplier = z.infer<typeof TypeMultiplier>;
export const TypeChartSchema = z.record(TypeName, z.record(TypeName, TypeMultiplier));
export type TypeChart = z.infer<typeof TypeChartSchema>;

// PokéAPI raw response schemas (used only by the build-time script)
export const PokeApiPokemonRawSchema = z.object({
  id: z.number().int().min(1).max(151),
  name: z.string(),
  types: z
    .array(
      z.object({
        slot: z.number(),
        type: z.object({ name: z.string() }), // we filter to TypeName below
      }),
    )
    .min(1)
    .max(2),
  stats: z.array(
    z.object({
      base_stat: z.number().int().min(1),
      stat: z.object({ name: z.string() }),
    }),
  ),
  moves: z.array(
    z.object({
      move: z.object({ name: z.string() }),
      version_group_details: z.array(
        z.object({
          level_learned_at: z.number().int(),
          move_learn_method: z.object({ name: z.string() }),
          version_group: z.object({ name: z.string() }),
        }),
      ),
    }),
  ),
  past_types: z
    .array(
      z.object({
        generation: z.object({ name: z.string() }),
        types: z
          .array(
            z.object({
              slot: z.number(),
              type: z.object({ name: z.string() }),
            }),
          )
          .min(1)
          .max(2),
      }),
    )
    .optional()
    .default([]),
  sprites: z.object({
    versions: z.object({
      'generation-i': z.object({
        'red-blue': z.object({
          front_default: z.string().nullable(),
        }),
        yellow: z.object({
          front_default: z.string().nullable(),
        }),
      }),
    }),
  }),
});

export const PokeApiMoveRawSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  power: z.number().int().nullable(),
  pp: z.number().int().nullable(),
  accuracy: z.number().int().nullable(),
  priority: z.number().int(),
  type: z.object({ name: z.string() }),
  damage_class: z.object({ name: z.string() }),
});

export const PokeApiTypeRawSchema = z.object({
  name: z.string(),
  damage_relations: z.object({
    double_damage_to: z.array(z.object({ name: z.string() })),
    half_damage_to: z.array(z.object({ name: z.string() })),
    no_damage_to: z.array(z.object({ name: z.string() })),
  }),
});
