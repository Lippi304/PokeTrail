// src/engine/types.ts
// Engine-internal types — pure TypeScript, no React imports.
// 15 Gen-1 types per D-06 (modern chart minus Steel/Dark/Fairy).
export type GenOneType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon';

export const GEN_ONE_TYPES: readonly GenOneType[] = [
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
] as const;

export type DamageClass = 'physical' | 'special' | 'status';
export type TypeMultiplier = 0 | 0.5 | 1 | 2;
export type TypeChart = Record<GenOneType, Record<GenOneType, TypeMultiplier>>;

export interface Combatant {
  level: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  types: readonly GenOneType[]; // 1 or 2 entries
}

export interface MoveLike {
  power: number | null; // null = status move
  type: GenOneType;
  damageClass: DamageClass;
}
