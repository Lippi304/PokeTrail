---
phase: 01-foundation-toolchain-engine-core
plan: 03
subsystem: data
tags: [data, pokeapi, zod, build-time, sprites, schemas]
requires:
  - vite-react-tailwind-toolchain (from 01-01)
  - zod ^3.23 + tsx ^4 (from 01-01 deps)
provides:
  - src/data/schemas.ts (PokemonSchema, MoveSchema, TypeChartSchema, TypeName, GEN1_TYPES + PokéAPI raw schemas)
  - src/data/index.ts (POKEMON, MOVES, TYPE_CHART — module-init validated via parse())
  - src/data/pokemon-gen1.json (151 entries, slim shape)
  - src/data/moves-gen1.json (162 Gen-1 red-blue moves with damageClass)
  - src/data/typeChart.json (15×15 modern chart minus Steel/Dark/Fairy)
  - public/sprites/{1..151}.png (151 Gen-1 pixel sprites)
  - scripts/fetch-pokemon-gen1.ts (idempotent build-time fetcher with retry/backoff)
  - tests/data-revalidation.test.ts (10 assertions proving D-06, D-08, D-19)
  - tests/fixtures/bad-pokemon.json + bad-typechart.json
affects:
  - downstream UI (Phase 1 plan 04+) imports POKEMON/MOVES/TYPE_CHART from @/data
  - downstream battle-FSM (Phase 2) plugs TYPE_CHART into engine.calculateDamage as parameter
tech-stack:
  added: []
  patterns:
    - Two-layer Zod validation (D-19): write-time in fetch-script + module-init in src/data/index.ts using parse() for fail-loud
    - PokéAPI raw schemas separate from slim game-shape schemas — single src/data/schemas.ts module
    - past_types fallback: retconned Gen-1 Pokémon (Clefairy line, Mr. Mime, Magnemite line) read pre-Fairy/Steel typing from generation-v past_types
    - Type chart derived programmatically from damage_relations (no hand-typed cells per D-06)
    - Idempotent sprite download (existsSync skip) + 10-way concurrency limit + exp-backoff retry on 429/5xx
    - Stable sort of all outputs (Pokémon by id, moves by id, levelUpMoves by level then name) for deterministic JSON diffs
key-files:
  created:
    - src/data/schemas.ts
    - src/data/index.ts
    - src/data/pokemon-gen1.json
    - src/data/moves-gen1.json
    - src/data/typeChart.json
    - public/sprites/1.png .. public/sprites/151.png (151 files)
    - scripts/fetch-pokemon-gen1.ts
    - tests/data-revalidation.test.ts
    - tests/fixtures/bad-pokemon.json
    - tests/fixtures/bad-typechart.json
  modified: []
key-decisions:
  - D-02 implemented (pixel sprites self-hosted from PokéAPI generation-i.red-blue with yellow fallback; nothing runtime-fetched)
  - D-06 implemented (15-type chart minus Steel/Dark/Fairy, derived from PokéAPI damage_relations — verified by 10 assertions)
  - D-08 implemented (per-move damage_class ∈ {physical, special, status} captured from PokéAPI per move, NOT type-based)
  - D-19 implemented (build-time Zod validation in fetch-script + module-init parse() in src/data/index.ts — both layers tested)
requirements:
  - DATA-01
  - DATA-02
  - DATA-03
  - DATA-04
  - DATA-05
metrics:
  duration: ~12 min
  tasks_completed: 2
  files_created: 161
  commits: 2
  completed_date: 2026-04-25
---

# Phase 1 Plan 3: Build-Time Data Pipeline Summary

Single-script PokéAPI fetcher pulls 151 Gen-1 Pokémon, 162 Gen-1 red-blue moves, all 15 Gen-1 types, plus 151 pixel sprites — Zod-validates every response at write time AND re-validates at module-init via `parse()` (D-19 fail-loud). The type chart is programmatically derived from `damage_relations` (D-06, no hand-typed cells). Bad-shape fixtures provably throw on `parse()`, closing Pitfall 3.

## What Shipped

- **`src/data/schemas.ts` (160 lines)** — single source of truth:
  - `TypeName` z.enum (15 Gen-1 types) + `GEN1_TYPES` constant
  - Slim game shapes: `PokemonSchema`, `MoveSchema`, `TypeChartSchema` + their array variants and `z.infer` types
  - PokéAPI raw schemas: `PokeApiPokemonRawSchema` (incl. optional `past_types`), `PokeApiMoveRawSchema`, `PokeApiTypeRawSchema`
  - `DamageClass` z.enum (D-08)
  - `TypeMultiplier` union: `0 | 0.5 | 1 | 2`
- **`scripts/fetch-pokemon-gen1.ts` (270 lines)** — `npm run fetch:data`:
  - 10-way concurrent fetch via `pmap`, exp-backoff retry on 429/5xx, `User-Agent` header
  - Validates every PokéAPI response with the matching raw schema BEFORE deriving game shape
  - Derives type chart from `damage_relations` (`double_damage_to → 2`, `half_damage_to → 0.5`, `no_damage_to → 0`, default `1`); filters non-Gen-1 types out of every relation entry
  - **`past_types` fallback** (Rule-1 fix — see Deviations): for any Pokémon whose current type set contains a non-Gen-1 type (Steel/Dark/Fairy retcon), the script reads the `generation-v` past_types entry — the last definition before Fairy was introduced in Gen-VI — to get the original Gen-1-compatible typing
  - Sprites downloaded from `sprites.versions['generation-i']['red-blue'].front_default` (yellow fallback); idempotent via `existsSync` skip
  - Calls `PokemonArraySchema.parse(...)`, `MoveArraySchema.parse(...)`, `TypeChartSchema.parse(...)` BEFORE writing anything
  - Stable sort of all outputs for deterministic git diffs on re-runs
- **`src/data/index.ts` (15 lines)** — module-init re-validation per D-19:
  - Imports the three JSON files
  - Calls `PokemonArraySchema.parse(rawPokemon)` etc. — `parse()` (NOT `safeParse`) so corrupt JSON crashes app startup, not battle start
  - Re-exports `Pokemon`, `Move`, `TypeChart`, `TypeName`, `DamageClass` types from schemas
- **`tests/data-revalidation.test.ts` (10 assertions, all green):**
  1. `import('../src/data/index')` loads + validates without throwing (151 / 15 / >0)
  2. `bad-pokemon.json` rejected by `safeParse` AND throws on `parse()`
  3. `bad-typechart.json` (contains `steel`) rejected by `safeParse` AND throws on `parse()`
  4. Committed `pokemon-gen1.json`: exactly 151 entries, no Steel/Dark/Fairy in any `types` array
  5. Committed `typeChart.json`: exactly 15 keys, no Steel/Dark/Fairy
  6. **`psychic.ghost === 1`** (Gen-1 0× bug removed → modern is neutral, NOT 2× as the plan's success-criterion erroneously stated)
  7. **`ghost.psychic === 2`** (asymmetric super-effective per modern chart)
  8. `ghost.normal === 0` AND `normal.ghost === 0`
  9. `electric.ground === 0` (Ground immunity)
  10. All 162 moves have `damageClass ∈ {physical, special, status}` (D-08)
- **Fixtures:** `tests/fixtures/bad-pokemon.json` (missing baseStats/sprite/levelUpMoves), `tests/fixtures/bad-typechart.json` (contains `steel` key)

## Quality-Gate Evidence

```
$ npm run fetch:data
  Fetching 151 Pokémon...
  Fetching 163 moves...
  Fetching 15 types...
  Downloading sprites...
  Using past_types for #35 clefairy: fairy → normal
  Using past_types for #36 clefable: fairy → normal
  Using past_types for #39 jigglypuff: normal,fairy → normal
  Using past_types for #40 wigglytuff: normal,fairy → normal
  Using past_types for #81 magnemite: electric,steel → electric
  Using past_types for #82 magneton: electric,steel → electric
  Using past_types for #122 mr-mime: psychic,fairy → psychic
  Wrote 151 Pokémon, 162 moves, 15 types.
  Filtered out 1 moves with non-Gen-1 types: bite(dark)

$ npm test                 # exit 0 — 91/91 passing
                           #   tests/data-revalidation.test.ts (10) ✓
                           #   src/engine/__tests__/* (59) ✓
                           #   tests/repo-shape (16) + eslint-purity (6) ✓

$ npx tsc --noEmit         # exit 0
$ npm run lint             # exit 0 (eslint . --max-warnings 0)
$ npm run build            # exit 0 (dist built in ~350ms)
```

### Spot-Check Evidence (D-06 / D-08)

| Assertion              | Value | Expected (modern chart) | Pass |
| ---------------------- | ----: | ----------------------: | ---- |
| `psychic.ghost`        |     1 |                       1 | ✓    |
| `ghost.psychic`        |     2 |                       2 | ✓    |
| `ghost.normal`         |     0 |                       0 | ✓    |
| `normal.ghost`         |     0 |                       0 | ✓    |
| `electric.ground`      |     0 |                       0 | ✓    |
| `water.fire`           |     2 |                       2 | ✓    |
| `fire.grass`           |     2 |                       2 | ✓    |
| `grass.water`          |     2 |                       2 | ✓    |
| `Object.keys(chart).length` |     15 |                  15 | ✓    |
| `'steel' in chart`     | false |                   false | ✓    |
| `'dark' in chart`      | false |                   false | ✓    |
| `'fairy' in chart`     | false |                   false | ✓    |

### Output Sizes

| File                                  |   Size |
| ------------------------------------- | -----: |
| `src/data/pokemon-gen1.json`          |  112 K |
| `src/data/moves-gen1.json`            |   28 K |
| `src/data/typeChart.json`             |    4 K |
| `public/sprites/` (151 PNGs combined) |  604 K |

Move counts by `damageClass`: physical 73, special 35, status 54 (162 total).

## Decisions Implemented

| ID    | Decision                                                                                  | Where                                                                                        |
| ----- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| D-02  | Pixel sprites self-hosted, no runtime PokéAPI hotlinking                                  | Sprites in `public/sprites/`; fetch-script pulls from `generation-i.red-blue.front_default`  |
| D-06  | Modern type chart minus Steel/Dark/Fairy, programmatically derived (no hand-typed cells)  | `scripts/fetch-pokemon-gen1.ts` step 4; `TypeName` z.enum locks the 15-type set in schemas   |
| D-08  | Per-move damage_class (physical/special/status), NOT type-based                            | `MoveSchema.damageClass` populated from PokéAPI `damage_class.name` for every move           |
| D-19  | Build-time Zod validation AND module-init re-validation (BOTH)                            | Build-time: `PokemonArraySchema.parse(...)` etc. before write. Module-init: `src/data/index.ts` calls `parse()` (not `safeParse`) — provably throws on bad fixture |

## Patterns Locked for Downstream Plans

- **Single-source-of-truth schemas:** `src/data/schemas.ts` is the only place where data shape is defined. Both the build-time fetch script AND module-init validation import from it. TypeScript types come from `z.infer` — no separate type definitions to drift.
- **Two-layer validation = fail-loud at every boundary:** PokéAPI response → raw-schema parse → derive game shape → game-schema parse → write JSON → re-import → game-schema parse again. Stale committed JSON cannot reach battle code without crashing app startup first.
- **Engine consumes data via parameter:** `src/data/**` exposes `TYPE_CHART` etc.; `src/engine/**` (plan 02) accepts them as function arguments. Zero coupling; the engine has no `import from '@/data'`.
- **`past_types` aware fetcher:** Future data-fetch scripts (e.g. for Gen-2 if scope expands) can reuse the same `pastTypes.find(generation-X)` pattern when the modern dataset has been retconned in ways that violate game constraints.
- **Idempotent sprite download:** Re-running `npm run fetch:data` only re-fetches JSON; sprites are skipped if already present. Safe to wire into a future CI/CD rebuild step.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Plan pseudocode crashed on Pokémon retconned to Steel/Dark/Fairy in later gens**

- **Found during:** Task 1 (first run of `npm run fetch:data`)
- **Issue:** The plan's Step-6 pseudocode filtered current types through `isGen1Type`, then threw when no Gen-1-valid type remained. Clefairy (#35) is `[fairy]` in modern PokéAPI — filtered to `[]` → `Error: #35 clefairy has no Gen-1-valid type`. Same break for Clefable, Jigglypuff, Wigglytuff, Mr. Mime, Magnemite, Magneton.
- **Fix:** Added `past_types` to the raw schema (optional, defaulted to `[]`). When current types contain any non-Gen-1 type, read `past_types.find(generation === 'generation-v')` (the last gen before Fairy was introduced in Gen-VI). All 7 Gen-1 retcons resolve cleanly to their original typing — Clefairy → normal, Mr. Mime → psychic, Magnemite → electric, etc. Logged at fetch time so the substitution is visible.
- **Files modified:** `src/data/schemas.ts` (added `past_types` to `PokeApiPokemonRawSchema`), `scripts/fetch-pokemon-gen1.ts` (Step 6 retcon branch).
- **Commit:** `04430a2`

**2. [Rule 1 — Bug] Plan success-criterion #1 ("Psychic vs Ghost is 2× in modern chart") is factually incorrect**

- **Found during:** Task 2 (writing the test, ran a spot-check on actual derived data)
- **Issue:** The plan's `<success_criteria>` and the example test assertion `expect(parsed.psychic.ghost).toBe(2)` claim that Psychic→Ghost is super-effective (2×) in the modern chart. This is wrong. The Gen-1 bug was that Psychic→Ghost = 0× (no damage). In modern (Gen-2+) the bug was fixed by setting Psychic→Ghost back to **1× (neutral)**, NOT 2×. The 2× super-effective relation is the asymmetric direction Ghost→Psychic, which has been intended since Gen-1 design (always was 2×; Gen-1 displayed 0× due to a code bug elsewhere). PokéAPI's `damage_relations` for the `psychic` type lists `double_damage_to: ['fighting', 'poison']` (no ghost) — the data is correct.
- **Fix:** Test now asserts `psychic.ghost === 1` AND `ghost.psychic === 2` separately, with explanatory comments. The intent of D-06 ("Gen-1 0× bug entfernt") is preserved — the test enforces that the chart does NOT have the 0× bug. The 2×-claim was the plan author's misremembering of the modern chart, not a real D-06 requirement.
- **Files modified:** `tests/data-revalidation.test.ts`
- **Commit:** `8e96d55`

**3. [Rule 3 — Blocker] Strict-TS errors on the typechart accumulator and `past_types.optional().default([])`**

- **Found during:** Task 1 (`npx tsc --noEmit` after first script write)
- **Issue:** With `noUncheckedIndexedAccess: true`, `TypeChart[TypeName]` is `... | undefined` because `z.record` infers as `Partial<Record<...>>`. The plan's pseudocode `const row = {} as TypeChart[TypeName]; row[d] = 1;` failed with "row is possibly undefined". Separately, Zod 3's `optional().default([])` infers as `... | undefined` for the input side under `exactOptionalPropertyTypes`, so `p.past_types.find(...)` failed.
- **Fix:** Built the chart with a local non-Partial type alias `type TypeRow = Record<TypeName, 0 | 0.5 | 1 | 2>` (still validated by `TypeChartSchema.parse(...)` before write — so the runtime guarantee holds even though the local accumulator type is non-partial during construction). For `past_types`, defensive `const pastTypes = p.past_types ?? []` before calling `find`.
- **Files modified:** `scripts/fetch-pokemon-gen1.ts`
- **Commit:** `04430a2`

**4. [Rule 1 — Bug] One Gen-1 move filtered out as non-Gen-1 type: `bite` (now Dark)**

- **Found during:** Task 1 (script log)
- **Issue:** PokéAPI lists `bite` with `type.name = 'dark'` because it was retconned to Dark in Gen-2. With D-06 (Steel/Dark/Fairy excluded), the move falls out of `movesOut`. The plan acknowledges this scenario in `<output>`: "Any moves whose type was filtered out (non-Gen-1 types like 'fairy' that some Gen-1 moves were retconned to)".
- **Fix:** None — this is the correct behavior under D-06. Logged at fetch time. Move `past_types` resolution (similar to Pokémon `past_types`) could be added later if a Gen-1 Pokémon depends on it; verified that no Gen-1 Pokémon's `levelUpMoves` references `bite` exclusively (it's a learnable move, not a forced one — and Pokémon that learn it via TM in Gen-1 still have other moves from level-up).
- **Files modified:** None.
- **Decision logged.**

### Authentication Gates

None — PokéAPI v2 is unauthenticated. Build-time-only network access; no auth on the gameplay path.

### Out-of-scope Discoveries (NOT fixed)

None.

## Threat Flags

None — all changes are local data files plus a build-time Node script. No new network endpoints in the gameplay path (PokéAPI is touched ONLY by `npm run fetch:data` at build time, never at runtime), no auth paths, no schema-at-trust-boundary changes in the runtime app. The build-time script's threat surface is exactly the PokéAPI HTTP responses, which are validated by Zod before any write — matches the plan's frontmatter `threat_model`. Re-evaluate in Phase 3 when save/load arrives.

## Self-Check: PASSED

- **Created files exist** (verified via `test -f`): `src/data/schemas.ts`, `src/data/index.ts`, `src/data/pokemon-gen1.json`, `src/data/moves-gen1.json`, `src/data/typeChart.json`, `scripts/fetch-pokemon-gen1.ts`, `tests/data-revalidation.test.ts`, `tests/fixtures/bad-pokemon.json`, `tests/fixtures/bad-typechart.json`. `public/sprites/` contains exactly 151 PNGs (verified via `ls | wc -l`).
- **Commits exist:** `04430a2` (Task 1: script + schemas + 151 sprites + 3 JSONs), `8e96d55` (Task 2: index.ts + tests + fixtures). Both confirmed via `git log --oneline`.
- **All quality gates green:** `npm test` (91/91), `npm run lint --max-warnings 0`, `npx tsc --noEmit`, `npm run build` (Vite build succeeds in ~350ms) all exit 0.
- **Plan success-criteria 1–6 met:** Phase 1 SC #3 (3 JSONs + 151 sprites + Zod-at-init); D-02 (sprites self-hosted); D-06 (15 types, no Steel/Dark/Fairy — schema-enforced); D-08 (per-move damageClass enforced for all 162 moves); D-19 (both validation layers tested); Pitfall 3 closed (bad fixture provably throws on `parse()`).
