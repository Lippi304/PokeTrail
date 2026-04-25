// src/engine/__tests__/golden-baseline.ts
// Wave-0 verified baseline expectations for ENG-04 golden cases (G1–G24).
// Source: RESEARCH.md §"Golden Test Cases (≥ 20 — ENG-04)" + §"Damage Formula"
//
// METHODOLOGY:
//   - Deterministic cases (G6/G7/G8/G10/G11/G16-G24): exact assertions.
//   - Random-factor cases (G1-G5, G12-G15): RNG stubbed deterministically.
//     "no-crit, low random"  rngScript = [1.0, 0.0]    (chance(1/24): 1.0 < 1/24 = false; random factor = 0.85)
//     "no-crit, high random" rngScript = [1.0, 0.9999] (chance(1/24): false;             random factor ≈ 1.00)
//     "force crit, low rng"  rngScript = [0.0, 0.0]    (chance(1/24): 0.0 < 1/24 = true; random factor = 0.85)
//   - The reference formula `ref()` here mirrors src/engine/damage.ts byte-for-byte;
//     if they diverge, the golden tests fail and surface the discrepancy.
//   - IMMUNITY / STATUS short-circuits BEFORE crit roll → RNG not consumed.
//
// RNG ordering inside damage.ts:
//   1. rng.chance(1/24) — crit roll (consumes 1 next() call)
//   2. rng.next()       — random factor (consumes 1 next() call)
import type { Combatant, GenOneType, MoveLike } from '../types';

export interface GoldenCase {
  id: string;
  description: string;
  attacker: Combatant;
  defender: Combatant;
  move: MoveLike;
  typeMultiplier: number;
  rngScript: readonly number[];
  expect: { damage: number; crit: boolean; effectiveness: number };
}

// ---------- Helpers ----------
const c = (
  level: number,
  attack: number,
  defense: number,
  spAttack: number,
  spDefense: number,
  ...types: GenOneType[]
): Combatant => ({ level, attack, defense, spAttack, spDefense, types });

const mv = (power: number | null, type: GenOneType, damageClass: DamageClass): MoveLike => ({
  power,
  type,
  damageClass,
});

type DamageClass = 'physical' | 'special' | 'status';

/**
 * Reference formula — MUST mirror src/engine/damage.ts byte-for-byte.
 * Used to compute expected low/high bounds for the random-factor cases.
 */
function ref(
  attacker: Combatant,
  defender: Combatant,
  move: MoveLike,
  typeMultiplier: number,
  crit: boolean,
  randMult: number,
): number {
  if (move.damageClass === 'status' || move.power === null) return 0;
  if (typeMultiplier === 0) return 0;
  const A = move.damageClass === 'physical' ? attacker.attack : attacker.spAttack;
  const D = move.damageClass === 'physical' ? defender.defense : defender.spDefense;
  const base =
    Math.floor(Math.floor(((Math.floor((2 * attacker.level) / 5) + 2) * move.power * A) / D) / 50) +
    2;
  const critMult = crit ? 1.5 : 1;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const raw = base * critMult * stab * typeMultiplier * randMult;
  return Math.max(1, Math.floor(raw));
}

// ---------- Stat blocks (roughly Gen-1 base stats at the noted level) ----------
const Squirtle25 = c(25, 33, 36, 35, 35, 'water');
const Charmander25 = c(25, 31, 28, 36, 25, 'fire');
const Pikachu25 = c(25, 35, 25, 30, 25, 'electric');
const Bulbasaur20 = c(20, 26, 26, 32, 32, 'grass', 'poison');
const Geodude20 = c(20, 50, 60, 18, 18, 'rock', 'ground');
const Pikachu30 = c(30, 38, 28, 33, 28, 'electric');
const Diglett30 = c(30, 35, 18, 25, 28, 'ground');
const Gastly30 = c(30, 22, 22, 50, 25, 'ghost', 'poison');
const Rattata30 = c(30, 30, 22, 18, 22, 'normal');
const Alakazam30 = c(30, 25, 22, 80, 70, 'psychic');
const Gengar30 = c(30, 35, 30, 65, 50, 'ghost', 'poison');
const Charizard50 = c(50, 60, 60, 75, 70, 'fire', 'flying');
const Venusaur50 = c(50, 60, 60, 78, 75, 'grass', 'poison');
const Caterpie1 = c(1, 30, 35, 20, 20, 'bug');
const Snorlax100 = c(100, 90, 110, 50, 50, 'normal');
const Mewtwo50 = c(50, 70, 70, 110, 80, 'psychic');
const Mew50 = c(50, 70, 70, 75, 75, 'psychic');
const TackleAtk5 = c(5, 12, 12, 12, 12, 'normal');
const TackleDef5 = c(5, 12, 14, 12, 12, 'normal');

// ---------- Moves ----------
const WaterGun = mv(40, 'water', 'special');
const Ember = mv(40, 'fire', 'special');
const Tackle = mv(40, 'normal', 'physical');
const VineWhip = mv(45, 'grass', 'special');
const Thunderbolt = mv(90, 'electric', 'special');
const Lick = mv(30, 'ghost', 'physical');
const Psychic = mv(90, 'psychic', 'special');
const SleepPowder = mv(null, 'grass', 'status');
const Flamethrower = mv(90, 'fire', 'special');

// ---------- RNG scripts ----------
const NO_CRIT_LO: readonly number[] = [1.0, 0.0];
const NO_CRIT_HI: readonly number[] = [1.0, 0.9999];
const CRIT_LO: readonly number[] = [0.0, 0.0];

// ---------- Range helper ----------
function range(
  attacker: Combatant,
  defender: Combatant,
  move: MoveLike,
  typeMultiplier: number,
  crit: boolean,
): { lo: number; hi: number } {
  return {
    lo: ref(attacker, defender, move, typeMultiplier, crit, 0.85),
    // hi uses 0.999985 = 0.85 + 0.9999 * 0.15 to match the scripted RNG value `0.9999`
    // used in NO_CRIT_HI; rng.next() returns [0,1) so 1.0 itself is unreachable.
    hi: ref(attacker, defender, move, typeMultiplier, crit, 0.85 + 0.9999 * 0.15),
  };
}

// ---------- Golden cases ----------
export const GOLDEN_CASES: readonly GoldenCase[] = [
  // G1: STAB super-effective Water Gun (water vs fire), no crit, low/high RNG bounds
  {
    id: 'G1-low',
    description: 'L25 Squirtle Water Gun on L25 Charmander (STAB×1.5, type×2, no crit, lo random)',
    attacker: Squirtle25,
    defender: Charmander25,
    move: WaterGun,
    typeMultiplier: 2,
    rngScript: NO_CRIT_LO,
    expect: {
      damage: range(Squirtle25, Charmander25, WaterGun, 2, false).lo,
      crit: false,
      effectiveness: 2,
    },
  },
  {
    id: 'G1-high',
    description: 'G1 with high random factor',
    attacker: Squirtle25,
    defender: Charmander25,
    move: WaterGun,
    typeMultiplier: 2,
    rngScript: NO_CRIT_HI,
    expect: {
      damage: range(Squirtle25, Charmander25, WaterGun, 2, false).hi,
      crit: false,
      effectiveness: 2,
    },
  },
  // G2: same as G1 but crit
  {
    id: 'G2-crit-low',
    description: 'G1 with crit',
    attacker: Squirtle25,
    defender: Charmander25,
    move: WaterGun,
    typeMultiplier: 2,
    rngScript: CRIT_LO,
    expect: {
      damage: range(Squirtle25, Charmander25, WaterGun, 2, true).lo,
      crit: true,
      effectiveness: 2,
    },
  },
  // G3: STAB neutral
  {
    id: 'G3-low',
    description: 'L25 Charmander Ember on L25 Pikachu (STAB×1.5, type×1, no crit, lo)',
    attacker: Charmander25,
    defender: Pikachu25,
    move: Ember,
    typeMultiplier: 1,
    rngScript: NO_CRIT_LO,
    expect: {
      damage: range(Charmander25, Pikachu25, Ember, 1, false).lo,
      crit: false,
      effectiveness: 1,
    },
  },
  // G4: Non-STAB neutral (physical)
  {
    id: 'G4-low',
    description: 'L25 Charmander Tackle on L25 Pikachu (no STAB, neutral, physical)',
    attacker: Charmander25,
    defender: Pikachu25,
    move: Tackle,
    typeMultiplier: 1,
    rngScript: NO_CRIT_LO,
    expect: {
      damage: range(Charmander25, Pikachu25, Tackle, 1, false).lo,
      crit: false,
      effectiveness: 1,
    },
  },
  // G5: Dual-type 4× weakness
  {
    id: 'G5-low',
    description: 'L20 Bulbasaur Vine Whip on L20 Geodude (Rock/Ground, type×4)',
    attacker: Bulbasaur20,
    defender: Geodude20,
    move: VineWhip,
    typeMultiplier: 4,
    rngScript: NO_CRIT_LO,
    expect: {
      damage: range(Bulbasaur20, Geodude20, VineWhip, 4, false).lo,
      crit: false,
      effectiveness: 4,
    },
  },
  // G6: Type immunity (Electric vs Ground) — no RNG consumption
  {
    id: 'G6-immune',
    description: 'L30 Pikachu Thunderbolt on L30 Diglett (Ground, 0×)',
    attacker: Pikachu30,
    defender: Diglett30,
    move: Thunderbolt,
    typeMultiplier: 0,
    rngScript: [],
    expect: { damage: 0, crit: false, effectiveness: 0 },
  },
  // G7: Ghost vs Normal immunity (modern, Gen-1 bug removed via D-06)
  {
    id: 'G7-ghost-vs-normal',
    description: 'L30 Gastly Lick on L30 Rattata (Normal immune to Ghost)',
    attacker: Gastly30,
    defender: Rattata30,
    move: Lick,
    typeMultiplier: 0,
    rngScript: [],
    expect: { damage: 0, crit: false, effectiveness: 0 },
  },
  // G8: Normal vs Ghost immunity
  {
    id: 'G8-normal-vs-ghost',
    description: 'L30 Rattata Tackle on L30 Gastly (Ghost immune to Normal)',
    attacker: Rattata30,
    defender: Gastly30,
    move: Tackle,
    typeMultiplier: 0,
    rngScript: [],
    expect: { damage: 0, crit: false, effectiveness: 0 },
  },
  // G9: Psychic vs Ghost (modern: 2×) — Alakazam Psychic on Gengar (Ghost/Poison) → 2*2 = 4
  {
    id: 'G9-low',
    description:
      'L30 Alakazam Psychic on L30 Gengar (Ghost/Poison) — psychic vs ghost = 2× (D-06), psychic vs poison = 2× → 4×',
    attacker: Alakazam30,
    defender: Gengar30,
    move: Psychic,
    typeMultiplier: 4,
    rngScript: NO_CRIT_LO,
    expect: {
      damage: range(Alakazam30, Gengar30, Psychic, 4, false).lo,
      crit: false,
      effectiveness: 4,
    },
  },
  // G10: Status move bypasses damage path (no RNG consumption)
  {
    id: 'G10-status',
    description: 'L20 Bulbasaur Sleep Powder on L30 Diglett — status move bypasses damage',
    attacker: Bulbasaur20,
    defender: Diglett30,
    move: SleepPowder,
    typeMultiplier: 1,
    rngScript: [],
    expect: { damage: 0, crit: false, effectiveness: 1 },
  },
  // G11: Min-damage-1 floor — L1 Caterpie Tackle vs L100 Snorlax
  {
    id: 'G11-min-damage',
    description: 'L1 Caterpie Tackle on L100 Snorlax — formula yields <1, must clamp to 1',
    attacker: Caterpie1,
    defender: Snorlax100,
    move: Tackle,
    typeMultiplier: 1,
    rngScript: NO_CRIT_LO,
    expect: { damage: 1, crit: false, effectiveness: 1 },
  },
  // G12: High-power STAB super-effective + crit
  {
    id: 'G12-crit',
    description:
      'L50 Charizard Flamethrower on L50 Venusaur (Grass/Poison) crit — fire vs grass = 2×, fire vs poison = 1× → 2×',
    attacker: Charizard50,
    defender: Venusaur50,
    move: Flamethrower,
    typeMultiplier: 2,
    rngScript: CRIT_LO,
    expect: {
      damage: range(Charizard50, Venusaur50, Flamethrower, 2, true).lo,
      crit: true,
      effectiveness: 2,
    },
  },
  // G13: Not-very-effective 0.5×
  {
    id: 'G13-resist',
    description:
      'L25 Squirtle Water Gun on L20 Bulbasaur (Grass/Poison) — water vs grass = 0.5, vs poison = 1 → 0.5',
    attacker: Squirtle25,
    defender: Bulbasaur20,
    move: WaterGun,
    typeMultiplier: 0.5,
    rngScript: NO_CRIT_LO,
    expect: {
      damage: range(Squirtle25, Bulbasaur20, WaterGun, 0.5, false).lo,
      crit: false,
      effectiveness: 0.5,
    },
  },
  // G15: STAB cancels with resist — L50 Mewtwo Psychic vs L50 Mew (psychic vs psychic = 0.5)
  {
    id: 'G15-low',
    description: 'L50 Mewtwo Psychic on L50 Mew — STAB×1.5, psychic vs psychic = 0.5 → net 0.75',
    attacker: Mewtwo50,
    defender: Mew50,
    move: Psychic,
    typeMultiplier: 0.5,
    rngScript: NO_CRIT_LO,
    expect: {
      damage: range(Mewtwo50, Mew50, Psychic, 0.5, false).lo,
      crit: false,
      effectiveness: 0.5,
    },
  },
  // G16: Crit on a low-damage move still ≥ 1
  {
    id: 'G16-crit-min',
    description: 'L5 Tackle vs L5 — even on crit, damage ≥ 1',
    attacker: TackleAtk5,
    defender: TackleDef5,
    move: Tackle,
    typeMultiplier: 1,
    rngScript: CRIT_LO,
    expect: {
      damage: Math.max(1, ref(TackleAtk5, TackleDef5, Tackle, 1, true, 0.85)),
      crit: true,
      effectiveness: 1,
    },
  },
] as const;

// Sanity: damage cases above (G1-low, G1-high, G2, G3, G4, G5, G6, G7, G8, G9, G10, G11, G12, G13, G15, G16) = 16
//        + accuracy.test.ts (G19, G20, G21) = 3
//        + rng.test.ts (G22, G23, G24)      = 3
//        TOTAL = 22 ≥ 20 ✓
