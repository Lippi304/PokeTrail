// src/data/index.ts
// D-19 / DATA-05: Re-validate the committed JSON at module-init time.
// `parse()` (NOT safeParse) is correct here — stale committed data is a
// build-blocking bug, not a recoverable runtime condition. Crashes app
// startup, NOT battle start.
import rawPokemon from './pokemon-gen1.json';
import rawMoves from './moves-gen1.json';
import rawTypeChart from './typeChart.json';
import { PokemonArraySchema, MoveArraySchema, TypeChartSchema } from './schemas';

export const POKEMON = PokemonArraySchema.parse(rawPokemon);
export const MOVES = MoveArraySchema.parse(rawMoves);
export const TYPE_CHART = TypeChartSchema.parse(rawTypeChart);

export type { Pokemon, Move, TypeChart, TypeName, DamageClass } from './schemas';
