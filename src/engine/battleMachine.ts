// src/engine/battleMachine.ts
// FSM skeleton for Phase 2: BattlePhase × BattleAction lookup + reducer entry.
// Engine-pure: no react, no Math.random, no Date.now, no src/data/** imports.
//
// RNG consumption order per turn (load-bearing for save/replay determinism, locked in
// 02-RESEARCH §"Pitfall 1"):
//   1) rng.chance(0.5) — ONLY if speed tie (resolveOrder, Plan 02-02)
//   2) For first mover:
//        2a) rng.next()         — accuracy (rollAccuracy)
//        2b) rng.chance(1/24)   — crit (calculateDamage, only if hit + non-immune + non-status)
//        2c) rng.next()         — random factor (calculateDamage, same conditions)
//   3) For second mover (only if not fainted by first): same 2a-2c
//   4) rng.nextInt(...)         — AI move pick on next selecting-entry (selectMove, Plan 02-02)
//
// This file (Plan 02-01) ships the type union + isLegal + reducer entry. Real handlers
// (handleSelecting, handleResolving, handleFaintCheck, etc.) come in Plan 02-02 by
// REPLACING the per-phase `throw new Error('not implemented')` branches in step().

import type {
  BattleAction,
  BattleEvent,
  BattlePhase,
  BattleState,
  TypeChart,
} from './types';
import type { RNG } from './rng';

type ActionType = BattleAction['type'];

/**
 * 9 × 5 phase × action legality table — locked verbatim from 02-RESEARCH §Pattern 1.
 * The `satisfies Record<BattlePhase, ...>` clause guarantees that adding a 10th
 * BattlePhase later (e.g. multi-target battles in Phase 11) without updating
 * this table produces a compile error.
 */
const LEGAL_ACTIONS = {
  selecting: new Set<ActionType>(['pickMove', 'switchTo', 'useItem', 'run']),
  resolving: new Set<ActionType>(['continue']),
  animatingPlayer: new Set<ActionType>(['continue']),
  animatingEnemy: new Set<ActionType>(['continue']),
  turnEnd: new Set<ActionType>(['continue']),
  faintCheck: new Set<ActionType>(['continue']),
  forceSwitch: new Set<ActionType>(['switchTo']),
  enemyFaintReward: new Set<ActionType>(['continue']),
  battleOver: new Set<ActionType>([]),
} as const satisfies Record<BattlePhase, ReadonlySet<ActionType>>;

/** Returns true iff `action.type` is admissible in `phase` per the locked truth-table. */
export function isLegal(phase: BattlePhase, action: BattleAction): boolean {
  return LEGAL_ACTIONS[phase].has(action.type);
}

/**
 * External context the reducer needs. Chart-as-parameter per Phase-1 D-14: the
 * engine never imports from src/data/**, callers reach the data layer.
 *
 * Future-Phase fields (deferred):
 *   - Phase 5+ may add `moves: ReadonlyMap<string, MoveLike>` once moves move
 *     off the participant; not needed in Phase 2 (D-25 / A1).
 *   - Phase 6 will add an `items` registry.
 */
export interface BattleContext {
  typeChart: TypeChart;
}

/** Reducer return shape per D-24: pure (next state, ordered events). */
export interface ReducerOutput {
  state: BattleState;
  events: BattleEvent[];
}

/**
 * Pure reducer entry. Throws on illegal action (fail-fast, A6) so UI bugs
 * surface loudly during development. Auto-advances through "internal" phases
 * (resolving / animating* / turnEnd / faintCheck / enemyFaintReward) until the
 * machine settles in a phase that requires user input.
 *
 * Plan 02-01 ships the entry + dispatch; per-phase `step()` handlers throw
 * "not implemented in skeleton" — Plan 02-02 replaces them with real logic
 * and will widen the `step()` signature to (state, action, rng, ctx, events).
 */
export function reducer(
  state: BattleState,
  action: BattleAction,
  rng: RNG,
  ctx: BattleContext,
): ReducerOutput {
  if (!isLegal(state.phase, action)) {
    throw new Error(`Illegal action ${action.type} in phase ${state.phase}`);
  }
  const events: BattleEvent[] = [];
  // Skeleton dispatch: only `state.phase` is needed because every non-terminal
  // case throws and `battleOver` returns state unchanged. Plan 02-02 will pass
  // action/rng/ctx/events through to real handlers and let the auto-advance
  // loop below converge to a user-input phase.
  let next = step(state);
  while (isAutoPhase(next.phase) && next.phase !== state.phase) {
    next = step(next);
  }
  // Reference rng/ctx/events here so the typed parameters are observable to
  // callers + future maintainers; the values are not consumed in the skeleton.
  void rng;
  void ctx;
  void events;
  return { state: next, events };
}

/**
 * Plan-02-01 SKELETON: every non-terminal phase throws "not implemented" so
 * callers know they hit an unwired branch. Plan 02-02 will REPLACE each
 * `throw` with a real handler call and widen the signature to also receive
 * (action, rng, ctx, events).
 *
 * The default branch uses `assertNever` to guarantee at compile time that any
 * future BattlePhase variant is added here too.
 */
function step(state: BattleState): BattleState {
  switch (state.phase) {
    case 'selecting':
      throw new Error('phase selecting not implemented in skeleton (Plan 02-02)');
    case 'resolving':
      throw new Error('phase resolving not implemented in skeleton (Plan 02-02)');
    case 'animatingPlayer':
      throw new Error('phase animatingPlayer not implemented in skeleton (Plan 02-02)');
    case 'animatingEnemy':
      throw new Error('phase animatingEnemy not implemented in skeleton (Plan 02-02)');
    case 'turnEnd':
      throw new Error('phase turnEnd not implemented in skeleton (Plan 02-02)');
    case 'faintCheck':
      throw new Error('phase faintCheck not implemented in skeleton (Plan 02-02)');
    case 'forceSwitch':
      throw new Error('phase forceSwitch not implemented in skeleton (Plan 02-02)');
    case 'enemyFaintReward':
      throw new Error('phase enemyFaintReward not implemented in skeleton (Plan 02-02)');
    case 'battleOver':
      // Terminal — never executes (battleOver has no legal actions, isLegal throws first).
      // Exists for type-exhaustiveness only; coverage tools may flag it as dead — intentional.
      return state;
    default:
      return assertNever(state.phase);
  }
}

/** Compile-time exhaustiveness check; throws at runtime if the type system was bypassed. */
function assertNever(phase: never): never {
  throw new Error(`Unhandled BattlePhase: ${String(phase)}`);
}

/** Phases that auto-advance via a synthetic `continue` action (no user input needed). */
function isAutoPhase(phase: BattlePhase): boolean {
  return (
    phase === 'resolving' ||
    phase === 'animatingPlayer' ||
    phase === 'animatingEnemy' ||
    phase === 'turnEnd' ||
    phase === 'faintCheck' ||
    phase === 'enemyFaintReward'
  );
}
