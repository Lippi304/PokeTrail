// src/engine/__tests__/battleMachine.test.ts
// Wave-0 contract tests for Phase 2 Plan 01.
//
// Task 1: type unions + npm script — Tests 1-5.
// Task 2: isLegal + reducer skeleton — Tests 6-9 (this section).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  BattleAction,
  BattleParticipant,
  BattlePhase,
  BattleState,
  GenOneType,
  MoveLike,
  Side,
  StatStages,
  TypeChart,
} from '../types';
import { createRng } from '../rng';
import { isLegal, reducer } from '../battleMachine';

// -----------------------------------------------------------------------------
// Inline minimal factories — Plan 02-02 will move these to battle-fixtures.ts.
// -----------------------------------------------------------------------------

function makeStatStages(): StatStages {
  return { atk: 0, def: 0, spA: 0, spD: 0, spe: 0, acc: 0, eva: 0 };
}

function makeParticipant(species: string): BattleParticipant {
  return {
    species,
    level: 5,
    attack: 10,
    defense: 10,
    spAttack: 10,
    spDefense: 10,
    speed: 10,
    types: ['normal'] as const satisfies readonly GenOneType[],
    hp: 20,
    maxHp: 20,
    moves: [
      { power: 40, type: 'normal', damageClass: 'physical' },
    ] as const satisfies readonly MoveLike[],
    statStages: makeStatStages(),
  };
}

// -----------------------------------------------------------------------------
// Phase-2 type contract — Wave 0
// -----------------------------------------------------------------------------

describe('Phase 2 types — Wave 0 contract', () => {
  it('Test 1: BattlePhase union exposes exactly the 9 locked phases (D-21)', () => {
    const all: BattlePhase[] = [
      'selecting',
      'resolving',
      'animatingPlayer',
      'animatingEnemy',
      'turnEnd',
      'faintCheck',
      'forceSwitch',
      'enemyFaintReward',
      'battleOver',
    ];
    expect(all).toHaveLength(9);
    expect(new Set(all).size).toBe(9);
  });

  it('Test 2: BattleAction discriminator covers the 5 locked types (D-22)', () => {
    const arr: BattleAction[] = [
      { type: 'pickMove', moveIndex: 0 },
      { type: 'switchTo', partyIndex: 0 },
      { type: 'useItem', itemId: 'potion' },
      { type: 'run' },
      { type: 'continue' },
    ];
    expect(arr.map((a) => a.type).sort()).toEqual(
      ['continue', 'pickMove', 'run', 'switchTo', 'useItem'],
    );
  });

  it('Test 3: BattleParticipant.statStages defaults to zero on all 7 fields (D-20)', () => {
    const p = makeParticipant('test');
    expect(p.statStages.atk).toBe(0);
    expect(p.statStages.def).toBe(0);
    expect(p.statStages.spA).toBe(0);
    expect(p.statStages.spD).toBe(0);
    expect(p.statStages.spe).toBe(0);
    expect(p.statStages.acc).toBe(0);
    expect(p.statStages.eva).toBe(0);
  });

  it('Test 4: MoveLike.priority is optional (D-23 / A1)', () => {
    const withPrio: MoveLike = { power: 40, type: 'normal', damageClass: 'physical', priority: 1 };
    const withoutPrio: MoveLike = { power: 40, type: 'normal', damageClass: 'physical' };
    expect(withPrio.priority ?? 0).toBe(1);
    expect(withoutPrio.priority ?? 0).toBe(0);
  });

  it('Test 5: package.json has "test:engine": "vitest run --project engine"', () => {
    const pkgPath = path.resolve(__dirname, '../../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['test:engine']).toBe('vitest run --project engine');
  });
});

// Force `Side` symbol to be referenced so unused-import lint passes.
const _exposeSide: Side = 'player';
void _exposeSide;

// -----------------------------------------------------------------------------
// Inline state factory for reducer tests (Task 2). Plan 02-02 will move this
// into a shared battle-fixtures.ts.
// -----------------------------------------------------------------------------

function makeState(phase: BattlePhase): BattleState {
  return {
    phase,
    turnNumber: 1,
    combatants: {
      player: makeParticipant('charmander'),
      enemy: makeParticipant('bulbasaur'),
    },
    pendingPlayerAction: null,
  };
}

const STUB_CHART = {} as TypeChart; // never read by skeleton — throw fires first

// -----------------------------------------------------------------------------
// isLegal — exhaustive 9 × 5 truth-table (locked in 02-RESEARCH §Pattern 1)
// -----------------------------------------------------------------------------

const PHASES: BattlePhase[] = [
  'selecting',
  'resolving',
  'animatingPlayer',
  'animatingEnemy',
  'turnEnd',
  'faintCheck',
  'forceSwitch',
  'enemyFaintReward',
  'battleOver',
];

const ACTIONS: BattleAction[] = [
  { type: 'pickMove', moveIndex: 0 },
  { type: 'switchTo', partyIndex: 0 },
  { type: 'useItem', itemId: 'potion' },
  { type: 'run' },
  { type: 'continue' },
];

const EXPECTED: Record<BattlePhase, ReadonlySet<BattleAction['type']>> = {
  selecting: new Set(['pickMove', 'switchTo', 'useItem', 'run']),
  resolving: new Set(['continue']),
  animatingPlayer: new Set(['continue']),
  animatingEnemy: new Set(['continue']),
  turnEnd: new Set(['continue']),
  faintCheck: new Set(['continue']),
  forceSwitch: new Set(['switchTo']),
  enemyFaintReward: new Set(['continue']),
  battleOver: new Set([]),
};

describe('isLegal — 9 × 5 phase × action coverage', () => {
  const cells = PHASES.flatMap((phase) =>
    ACTIONS.map((action) => ({
      phase,
      action,
      expected: EXPECTED[phase].has(action.type),
    })),
  );

  it.each(cells)(
    'isLegal($phase, $action.type) -> $expected',
    ({ phase, action, expected }) => {
      expect(isLegal(phase, action)).toBe(expected);
    },
  );
});

// -----------------------------------------------------------------------------
// Reducer — throw on illegal action (skeleton smoke tests)
// -----------------------------------------------------------------------------

describe('Reducer throws on illegal action', () => {
  it('Test 7: phase=battleOver + pickMove throws (battleOver legal-set is empty)', () => {
    const state = makeState('battleOver');
    const rng = createRng(1);
    expect(() =>
      reducer(state, { type: 'pickMove', moveIndex: 0 }, rng, { typeChart: STUB_CHART }),
    ).toThrow(/illegal action/i);
  });

  it('Test 8: error message names both action.type and phase', () => {
    const state = makeState('battleOver');
    const rng = createRng(1);
    expect(() =>
      reducer(state, { type: 'pickMove', moveIndex: 0 }, rng, { typeChart: STUB_CHART }),
    ).toThrow(/pickMove.*battleOver|battleOver.*pickMove/);
  });

  it('Test 9: phase=battleOver + continue still throws (battleOver has no legal actions)', () => {
    const state = makeState('battleOver');
    const rng = createRng(1);
    expect(() =>
      reducer(state, { type: 'continue' }, rng, { typeChart: STUB_CHART }),
    ).toThrow(/illegal action/i);
  });
});

// -----------------------------------------------------------------------------
// Reducer logic — Plan 02-02 Tests M1..M6
// Locks: full 1v1 turn flow, mid-turn faint check (Pitfall 2), event-order
// contract (Pattern 3), auto-advance termination, reducer purity.
// -----------------------------------------------------------------------------

import type { BattleEvent } from '../types';
import {
  makeBulbasaur,
  makeCharmander,
  makeFixtureChart,
  makeInitialBattleState,
  makeMove,
} from './battle-fixtures';
import type { RNG } from '../rng';

/**
 * Tiny scripted RNG for deterministic edge-case tests (forced miss / forced
 * hit / forced no-crit). Pops `next` values from the supplied array; throws on
 * exhaustion (catches off-by-one consumption bugs in tests).
 */
function scriptedRng(values: readonly number[]): RNG {
  let counter = 0;
  let i = 0;
  const api: RNG = {
    next() {
      if (i >= values.length) {
        throw new Error(`scriptedRng exhausted at counter=${counter}`);
      }
      counter++;
      const v = values[i];
      i++;
      if (v === undefined) {
        throw new Error(`scriptedRng got undefined at counter=${counter}`);
      }
      return v;
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

describe('Reducer M1: selecting → full turn auto-advances to next selecting or battleOver', () => {
  it('dispatches pickMove from selecting and lands in selecting or battleOver, with turnStart first', () => {
    const state = makeInitialBattleState({
      player: makeCharmander(),
      enemy: makeBulbasaur(),
    });
    const ctx = { typeChart: makeFixtureChart() };
    const rng = createRng(0xc0ffee);
    const out = reducer(
      state,
      { type: 'pickMove', moveIndex: 0 },
      rng,
      ctx,
    );
    expect(['selecting', 'battleOver']).toContain(out.state.phase);
    expect(out.events.length).toBeGreaterThan(0);
    const first = out.events[0];
    expect(first?.type).toBe('turnStart');
    const last = out.events[out.events.length - 1];
    expect(['turnEnd', 'battleEnded']).toContain(last?.type);
  });
});

describe('Reducer M2: faint mid-turn — second mover is skipped if first OHKOs', () => {
  it('player OHKOs enemy; enemy never emits moveUsed; battleOver with winner=player', () => {
    // Player faster (speed 13 vs 11) AND enemy.hp = 1 → any successful hit OHKOs.
    // Use scripted RNG to FORCE: AI-pick (idx 0) → no speed-tie path → hit player accuracy → no crit → random factor mid.
    // RNG order at start of resolving (this implementation):
    //   1) selectMove → nextInt → 1× next() (returns 0 → idx 0)
    //   2) resolveOrder: speeds differ (13 vs 11), NO RNG consumed
    //   3) player mover: rollAccuracy → next() (must hit, accuracy 100% so any < 1.0 works)
    //   4) calculateDamage: chance(1/24) crit → next() (must NOT crit, value > 1/24)
    //   5) calculateDamage: random factor → next()
    //   → enemy faints, second mover skipped
    const player = makeCharmander({ hp: 19, maxHp: 19 });
    const enemy = makeBulbasaur({ hp: 1, maxHp: 20 });
    const state = makeInitialBattleState({ player, enemy });
    const ctx = { typeChart: makeFixtureChart() };
    const rng = scriptedRng([
      0.0, // 1) AI selectMove nextInt → idx 0
      0.5, // 3) accuracy roll: 0.5 < 1.0 → hit
      0.9, // 4) crit roll: 0.9 >= 1/24 → no crit
      0.5, // 5) random factor mid
    ]);
    const out = reducer(
      state,
      { type: 'pickMove', moveIndex: 0 },
      rng,
      ctx,
    );

    // Faint event for enemy must exist and there must be no enemy moveUsed.
    const enemyFaintIdx = out.events.findIndex(
      (e) => e.type === 'fainted' && e.side === 'enemy',
    );
    expect(enemyFaintIdx).toBeGreaterThanOrEqual(0);
    const enemyMoveUsed = out.events.find(
      (e) => e.type === 'moveUsed' && e.side === 'enemy',
    );
    expect(enemyMoveUsed).toBeUndefined();

    // battleOver with winner=player.
    expect(out.state.phase).toBe('battleOver');
    const ended = out.events.find((e) => e.type === 'battleEnded');
    expect(ended).toEqual({ type: 'battleEnded', winner: 'player' });
  });
});

describe('Reducer M3: event sequence on a missing player move', () => {
  it('forced miss emits moveUsed → moveMissed (no damageDealt); enemy still acts', () => {
    // Lower accuracy on player's chosen move so the floor doesn't override.
    // Move accuracy 70 (= floor 0.7 effective), accuracy roll value 0.71 → miss.
    const player = makeCharmander({
      moves: [
        makeMove({
          name: 'Shaky Ember',
          type: 'fire',
          power: 40,
          damageClass: 'special',
          accuracy: 70,
        }),
      ],
    });
    const enemy = makeBulbasaur();
    const state = makeInitialBattleState({ player, enemy });
    const ctx = { typeChart: makeFixtureChart() };
    const rng = scriptedRng([
      0.0, // 1) AI nextInt → idx 0 (vine whip)
      0.71, // 3) player accuracy: 0.71 >= 0.70 → MISS
      0.5, // 5) enemy accuracy roll: hit (vine whip 100% acc → any < 1.0)
      0.9, // 6) enemy crit: no crit
      0.5, // 7) enemy random factor
    ]);
    const out = reducer(
      state,
      { type: 'pickMove', moveIndex: 0 },
      rng,
      ctx,
    );

    // Sequence: turnStart → moveUsed(player) → moveMissed(player) → ... no damageDealt to enemy from player
    const playerMoveUsedIdx = out.events.findIndex(
      (e) => e.type === 'moveUsed' && e.side === 'player',
    );
    const playerMoveMissedIdx = out.events.findIndex(
      (e) => e.type === 'moveMissed' && e.side === 'player',
    );
    expect(playerMoveUsedIdx).toBeGreaterThanOrEqual(0);
    expect(playerMoveMissedIdx).toBeGreaterThan(playerMoveUsedIdx);

    // No damageDealt to enemy from the missed player move (enemy may take 0 damage events period if player was first; check that no damageDealt happens BEFORE moveMissed for enemy side).
    const damageBeforeMiss = out.events
      .slice(0, playerMoveMissedIdx)
      .find((e) => e.type === 'damageDealt' && e.side === 'enemy');
    expect(damageBeforeMiss).toBeUndefined();

    // Enemy still acts: enemy moveUsed must be present after the miss (enemy was second mover or first).
    const enemyMoveUsed = out.events.find(
      (e) => e.type === 'moveUsed' && e.side === 'enemy',
    );
    expect(enemyMoveUsed).toBeDefined();
  });
});

describe('Reducer M4: event sequence on a hit (super-effective, no crit)', () => {
  it('emits moveUsed → superEffective → damageDealt → hpChanged in that order', () => {
    const player = makeCharmander();
    const enemy = makeBulbasaur(); // grass/poison → fire is 2× × 1 = 2× super-effective
    const state = makeInitialBattleState({ player, enemy });
    const ctx = { typeChart: makeFixtureChart() };
    const rng = scriptedRng([
      0.0, // 1) AI nextInt → idx 0 (vine whip)
      0.5, // 3) player accuracy: hit
      0.9, // 4) crit: no crit
      0.5, // 5) random factor
      0.5, // 6) enemy accuracy: hit
      0.9, // 7) enemy crit: no
      0.5, // 8) enemy random factor
    ]);
    const out = reducer(
      state,
      { type: 'pickMove', moveIndex: 0 }, // player picks Ember (idx 0)
      rng,
      ctx,
    );

    // Find player mover event slice between turnStart and the second moveUsed (enemy's).
    const moveUsedIndices = out.events
      .map((e, i) => (e.type === 'moveUsed' ? i : -1))
      .filter((i) => i >= 0);
    expect(moveUsedIndices.length).toBeGreaterThanOrEqual(1);
    const firstMoveUsed = moveUsedIndices[0];
    if (firstMoveUsed === undefined) throw new Error('no moveUsed events');
    const firstMoveUsedEvt = out.events[firstMoveUsed];
    expect(firstMoveUsedEvt?.type).toBe('moveUsed');
    if (firstMoveUsedEvt?.type !== 'moveUsed') throw new Error('unreachable');
    // Player is faster (13 > 11) → first mover is player.
    expect(firstMoveUsedEvt.side).toBe('player');

    // Slice covering the player's mover events (until next moveUsed or end).
    const secondMoveUsed = moveUsedIndices[1];
    const sliceEnd =
      secondMoveUsed !== undefined ? secondMoveUsed : out.events.length;
    const playerSlice = out.events.slice(firstMoveUsed, sliceEnd);

    // Order assertion: moveUsed(player) → superEffective → damageDealt(enemy) → hpChanged(enemy).
    const seIdx = playerSlice.findIndex((e) => e.type === 'superEffective');
    const ddIdx = playerSlice.findIndex(
      (e) => e.type === 'damageDealt' && e.side === 'enemy',
    );
    const hpIdx = playerSlice.findIndex(
      (e) => e.type === 'hpChanged' && e.side === 'enemy',
    );
    expect(seIdx).toBeGreaterThan(0);
    expect(ddIdx).toBeGreaterThan(seIdx);
    expect(hpIdx).toBeGreaterThan(ddIdx);

    // No crit event in this slice (we forced no-crit).
    const critIdx = playerSlice.findIndex((e) => e.type === 'crit');
    expect(critIdx).toBe(-1);
  });
});

describe('Reducer M5: auto-advance terminates at user-input phase or battleOver', () => {
  it('returned phase is selecting or battleOver, never an auto-phase', () => {
    const state = makeInitialBattleState({
      player: makeCharmander(),
      enemy: makeBulbasaur(),
    });
    const ctx = { typeChart: makeFixtureChart() };
    const rng = createRng(1);
    const out = reducer(
      state,
      { type: 'pickMove', moveIndex: 0 },
      rng,
      ctx,
    );
    expect(['selecting', 'battleOver']).toContain(out.state.phase);
    // Explicitly NOT one of the auto-phases.
    const autoPhases = [
      'resolving',
      'animatingPlayer',
      'animatingEnemy',
      'turnEnd',
      'faintCheck',
      'enemyFaintReward',
    ];
    expect(autoPhases).not.toContain(out.state.phase);
  });
});

describe('Reducer M6: input state is not mutated (purity)', () => {
  it('reducer returns fresh state — input snapshot deep-equals original after call', () => {
    const state = makeInitialBattleState({
      player: makeCharmander(),
      enemy: makeBulbasaur(),
    });
    const snapshot = structuredClone(state);
    const ctx = { typeChart: makeFixtureChart() };
    const rng = createRng(0x42);
    reducer(state, { type: 'pickMove', moveIndex: 0 }, rng, ctx);
    expect(state).toEqual(snapshot);
  });
});

// Reference scripted-rng + BattleEvent so TS keeps them considered used.
void scriptedRng;
type _BattleEventRef = BattleEvent;
void (null as unknown as _BattleEventRef | null);

// -----------------------------------------------------------------------------
// Plan 02-03: Charmander vs Bulbasaur 1v1 integration scenario (Phase-2 ENG-06 SC#2)
//
// SCENARIO_SEED: 0xC0FFEE  (chosen per 02-CONTEXT §Specifics; the 4 fallback seeds
// from the plan — 0xBADA55, 0xFEEDBEE5, 0x1337, 0x2A — were tested during the
// probe-run stage and all produce the same 2-iteration outcome shape because
// Charmander's Ember vs grass/poison Bulbasaur is matchup-determined, not
// seed-sensitive at these Lvl-5 stats).
//
// Locked from probe-run on 2026-04-25. If this test fails after a battleMachine.ts
// (or upstream rng/damage/accuracy/typeChart/ai/battleResolution) change, the
// most likely causes (in order):
//   (1) RNG consumption order changed — re-read 02-RESEARCH §Pitfall 1 +
//       battleMachine.ts file header.
//   (2) Event emission order changed — re-read 02-RESEARCH §Pattern 3.
//   (3) Auto-advance loop changed — re-read 02-RESEARCH §Pattern 2.
//   (4) Damage / type-multiplier / fixture stats changed — locked HPs will drift.
//   (5) Intentional behavior change — re-run the probe-run pattern (revert to
//       soft asserts, capture new values, replace hard asserts) in two atomic
//       commits so the audit trail is preserved.
// -----------------------------------------------------------------------------

/**
 * Helper: run the locked Charmander-vs-Bulbasaur scenario to completion under a
 * given seed. Returns the final state, full event stream, RNG counter, and
 * turn-loop iteration count. Used by all three it-blocks below.
 */
function runCharmanderVsBulbasaurScenario(seed: number): {
  state: BattleState;
  events: BattleEvent[];
  rngCounter: number;
  turnIterations: number;
} {
  const rng = createRng(seed);
  const ctx = { typeChart: makeFixtureChart() };
  let state: BattleState = makeInitialBattleState({
    player: makeCharmander(),
    enemy: makeBulbasaur(),
  });
  const events: BattleEvent[] = [];
  let turnIterations = 0;
  const MAX_TURNS = 100;
  while (state.phase !== 'battleOver') {
    if (turnIterations > MAX_TURNS) {
      throw new Error(
        `Battle did not end within ${MAX_TURNS} turns — likely infinite loop`,
      );
    }
    const action: BattleAction =
      state.phase === 'selecting'
        ? { type: 'pickMove', moveIndex: 0 }
        : { type: 'continue' };
    const out = reducer(state, action, rng, ctx);
    state = out.state;
    events.push(...out.events);
    turnIterations++;
  }
  return { state, events, rngCounter: rng.counter, turnIterations };
}

const SCENARIO_SEED = 0xc0ffee;

describe('Charmander vs Bulbasaur 1v1 integration scenario (Phase-2 ENG-06 SC#2)', () => {
  it('runs to battleOver under fixed seed with deterministic outcome', () => {
    const { state, events, rngCounter, turnIterations } =
      runCharmanderVsBulbasaurScenario(SCENARIO_SEED);

    // === HARD LOCKS (captured from probe-run on 2026-04-25; ANY change = drift) ===
    expect(state.phase).toBe('battleOver');

    // (1) Winner — player wins (Charmander OHKOs Bulbasaur via 2× super-effective Ember).
    const ended = events.find((e) => e.type === 'battleEnded');
    expect(ended).toEqual({ type: 'battleEnded', winner: 'player' });

    // (2) Final HPs — player took some chip damage from Bulbasaur's turn-1 hit.
    expect(state.combatants.player.hp).toBe(16);
    expect(state.combatants.enemy.hp).toBe(0);

    // (3) Final turn number — incremented after each handleResolving pass.
    expect(state.turnNumber).toBe(3);

    // (4) RNG counter — drift here means upstream RNG consumption order changed
    // (Pitfall 1: AI selectMove → resolveOrder speed-tie → mover1 acc/crit/random
    // → mover2 acc/crit/random). Per turn baseline = 7 RNG steps when both movers
    // act and no speed-tie / no immunity. Turn 1 (both act) = 7; turn 2 (player
    // OHKOs first, mid-turn faint check skips enemy) = 4 (1 AI pick + 3 player
    // acc/crit/random). 7 + 4 = 11 — captured value.
    expect(rngCounter).toBe(11);

    // (5) Total event count — adding/removing any event in any handler fails here.
    expect(events).toHaveLength(18);

    // (6) Turn-loop iterations — one per `while (phase !== 'battleOver')` pass.
    expect(turnIterations).toBe(2);

    // (7) Event histogram — every event type appears exactly the expected count.
    // Pattern-3 emission per mover: moveUsed → (moveMissed | (crit?) →
    // (effectiveness?) → damageDealt → hpChanged → (fainted?))
    const histogram = events.reduce<Record<string, number>>((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + 1;
      return acc;
    }, {});
    expect(histogram).toEqual({
      turnStart: 2,
      moveUsed: 3,
      superEffective: 2,
      damageDealt: 3,
      hpChanged: 3,
      notVeryEffective: 1,
      turnEnd: 2,
      fainted: 1,
      battleEnded: 1,
    });
  });

  it('emits turnStart and turnEnd as a balanced pair every turn', () => {
    // Independent invariant test — runs the same scenario but only checks
    // structural health (not exact values). Catches "we emitted turnStart but
    // forgot turnEnd" bugs even if the locked baseline above passes for a
    // different reason. Also locks the terminal-event ordering (turnEnd second
    // to last, battleEnded last) which the histogram doesn't capture by itself.
    const { events } = runCharmanderVsBulbasaurScenario(SCENARIO_SEED);
    const starts = events.filter((e) => e.type === 'turnStart').length;
    const ends = events.filter((e) => e.type === 'turnEnd').length;
    expect(starts).toBe(ends);
    expect(events.filter((e) => e.type === 'battleEnded')).toHaveLength(1);
    expect(events.at(-1)?.type).toBe('battleEnded');
    // turnEnd must be the second-to-last event (battleEnded is always last).
    expect(events.at(-2)?.type).toBe('turnEnd');
  });

  it('proves determinism: identical seed produces identical event stream byte-for-byte', () => {
    // Catches non-determinism bugs that ALSO happen to match the locked
    // values above (rare but possible — e.g. a freshly-introduced Math.random
    // that on its first call produces a value matching the locked behavior).
    // Two independent createRng instances must yield bitwise-identical results.
    const a = runCharmanderVsBulbasaurScenario(SCENARIO_SEED);
    const b = runCharmanderVsBulbasaurScenario(SCENARIO_SEED);
    expect(a.events).toEqual(b.events);
    expect(a.rngCounter).toBe(b.rngCounter);
    expect(a.turnIterations).toBe(b.turnIterations);
    expect(a.state.combatants.player.hp).toBe(b.state.combatants.player.hp);
    expect(a.state.combatants.enemy.hp).toBe(b.state.combatants.enemy.hp);
    expect(a.state.turnNumber).toBe(b.state.turnNumber);
    expect(a.state.phase).toBe(b.state.phase);
  });
});
