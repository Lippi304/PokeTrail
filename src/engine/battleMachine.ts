// src/engine/battleMachine.ts
// Phase-2 reducer: 1v1 turn loop with full event-stream emission.
// Engine-pure: no react, no Math.random, no Date.now, no src/data/** imports.
//
// RNG consumption order per turn (load-bearing for save/replay determinism,
// locked in 02-RESEARCH §"Pitfall 1" + reaffirmed in 02-02-PLAN execution_notes):
//
//   For each `pickMove` dispatch from `selecting`, the reducer consumes the
//   stream in this exact order:
//
//     1) AI move pick: rng.nextInt(0, enemy.moves.length - 1)            (1 step)
//        — done at the START of handleResolving, before resolveOrder.
//     2) Speed-tie: rng.chance(0.5)                                       (1 step,
//        ONLY if playerSpeed === enemySpeed and priorities are equal)
//     3) For first mover (per resolveOrder):
//          3a) accuracy: rng.next() (rollAccuracy)                        (1 step,
//              skipped if move.accuracy === null)
//          3b) crit:    rng.chance(1/24) inside calculateDamage           (1 step,
//              ONLY if hit + non-status + non-immune)
//          3c) random:  rng.next() inside calculateDamage                 (1 step,
//              same conditions as 3b)
//     4) For second mover (only if NOT KO'd by first): same 3a-3c.
//
// Event-order contract per mover (Pattern 3 from 02-RESEARCH):
//
//   moveUsed
//   → moveMissed | (crit?) → (superEffective | notVeryEffective | noEffect)?
//                          → damageDealt → hpChanged → (fainted)?
//
// Plan 02-03's integration test will assert this stream byte-for-byte.

import { produce } from 'immer';
import type {
  BattleAction,
  BattleEvent,
  BattleParticipant,
  BattlePhase,
  BattleState,
  MoveLike,
  Side,
  TypeChart,
} from './types';
import type { RNG } from './rng';
import { calculateDamage } from './damage';
import { rollAccuracy } from './accuracy';
import { getTypeMultiplier } from './typeChart';
import { resolveOrder } from './battleResolution';
import { selectMove } from './ai';

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
 * engine never imports from src/data/**; callers reach the data layer.
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
 * surface loudly during development. Auto-advances through internal phases
 * (resolving / animating* / turnEnd / faintCheck / enemyFaintReward) until the
 * machine settles in a phase that requires user input (`selecting` /
 * `forceSwitch`) or terminates (`battleOver`).
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
  // Initial step uses the user-supplied action.
  let next = step(state, action, rng, ctx, events);
  // Auto-advance: each internal phase consumes a synthetic `continue`. Stop
  // when the phase no longer auto-advances (battleOver / selecting / forceSwitch)
  // OR when no transition occurred (defensive — should never happen with the
  // current handlers but prevents pathological infinite loops).
  while (isAutoPhase(next.phase)) {
    const before = next.phase;
    next = step(next, { type: 'continue' }, rng, ctx, events);
    if (next.phase === before) {
      throw new Error(
        `Reducer auto-advance stuck in phase ${before} — no transition occurred`,
      );
    }
  }
  return { state: next, events };
}

/**
 * Per-phase dispatch. Each non-terminal handler returns the next state and
 * may push events into the shared events array.
 *
 * The default branch uses `assertNever` to guarantee at compile time that any
 * future BattlePhase variant is added here too.
 */
function step(
  state: BattleState,
  action: BattleAction,
  rng: RNG,
  ctx: BattleContext,
  events: BattleEvent[],
): BattleState {
  switch (state.phase) {
    case 'selecting':
      return handleSelecting(state, action, events);
    case 'resolving':
      return handleResolving(state, rng, ctx, events);
    case 'animatingPlayer':
      return advance(state, 'animatingEnemy');
    case 'animatingEnemy':
      return advance(state, 'turnEnd');
    case 'turnEnd':
      return handleTurnEnd(state, events);
    case 'faintCheck':
      return handleFaintCheck(state, events);
    case 'forceSwitch':
      // Phase 5+ wires multi-Pokémon teams. In Phase-2 1v1 scope this is
      // unreachable: handleFaintCheck routes a fainted player straight to
      // battleOver instead of forceSwitch. Kept for type-exhaustiveness.
      throw new Error('phase forceSwitch not implemented in Phase 2 1v1 scope');
    case 'enemyFaintReward':
      // Phase 4 (XP/level-up) wires this. Phase-2 1v1 path goes through
      // faintCheck → battleOver and never lands here.
      throw new Error(
        'phase enemyFaintReward not implemented in Phase 2 (XP comes Phase 4)',
      );
    case 'battleOver':
      // Terminal — never executes (battleOver has no legal actions, isLegal
      // throws first). Exists for type-exhaustiveness only.
      return state;
    default:
      return assertNever(state.phase);
  }
}

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

function handleSelecting(
  state: BattleState,
  action: BattleAction,
  events: BattleEvent[],
): BattleState {
  if (action.type !== 'pickMove') {
    // switchTo / useItem / run are legal per LEGAL_ACTIONS but not implemented
    // until Phase 5/6/4 respectively. Throw so callers don't silently no-op.
    throw new Error(
      `${action.type} not implemented in Phase 2 (1v1 + pickMove only)`,
    );
  }
  events.push({ type: 'turnStart', turnNumber: state.turnNumber });
  return produce(state, (draft) => {
    draft.pendingPlayerAction = {
      type: 'pickMove',
      moveIndex: action.moveIndex,
    };
    draft.phase = 'resolving';
  });
}

function handleResolving(
  state: BattleState,
  rng: RNG,
  ctx: BattleContext,
  events: BattleEvent[],
): BattleState {
  const pending = state.pendingPlayerAction;
  if (pending === null) {
    throw new Error('handleResolving: no pendingPlayerAction set');
  }

  const playerMove = state.combatants.player.moves[pending.moveIndex];
  if (playerMove === undefined) {
    throw new Error(
      `handleResolving: player has no move at index ${pending.moveIndex}`,
    );
  }

  // RNG step 1: AI pick. Done BEFORE resolveOrder so the counter position
  // for speed-tie remains predictable (locked in Plan 02-02 execution_notes).
  const enemyMoveIndex = selectMove(state, rng, 'random');
  const enemyMove = state.combatants.enemy.moves[enemyMoveIndex];
  if (enemyMove === undefined) {
    throw new Error(
      `handleResolving: enemy has no move at index ${enemyMoveIndex}`,
    );
  }

  // RNG step 2 (only on speed-tie): resolveOrder consumes 1 chance() if needed.
  const order = resolveOrder(
    playerMove,
    enemyMove,
    state.combatants.player.speed,
    state.combatants.enemy.speed,
    rng,
  );

  // Per-mover working state — we mutate via Immer at the end.
  // Use a mutable copy of HP so we can apply mid-turn faint check (Pitfall 2)
  // without committing to Immer's draft until done.
  let playerHp = state.combatants.player.hp;
  let enemyHp = state.combatants.enemy.hp;

  for (const side of order) {
    // Mid-turn faint check — Pitfall 2. If the would-be mover already fainted
    // (hp <= 0), skip its move entirely.
    const isPlayerMover = side === 'player';
    const moverHp = isPlayerMover ? playerHp : enemyHp;
    if (moverHp <= 0) continue;

    const attacker: BattleParticipant = isPlayerMover
      ? state.combatants.player
      : state.combatants.enemy;
    const defender: BattleParticipant = isPlayerMover
      ? state.combatants.enemy
      : state.combatants.player;
    const move: MoveLike = isPlayerMover ? playerMove : enemyMove;
    const moveName = move.name ?? '???';

    events.push({ type: 'moveUsed', side, moveName });

    // RNG step 3a: accuracy.
    const hit = rollAccuracy(move.accuracy ?? null, rng);
    if (!hit) {
      events.push({ type: 'moveMissed', side, moveName });
      continue;
    }

    // Status / no-power moves: skip damage path entirely (no further RNG).
    if (move.damageClass === 'status' || move.power === null) {
      continue;
    }

    // Type effectiveness (no RNG).
    const typeMult = getTypeMultiplier(
      move.type,
      defender.types,
      ctx.typeChart,
    );

    // RNG steps 3b + 3c: crit + random factor inside calculateDamage. Type
    // immunity (typeMult === 0) short-circuits inside calculateDamage WITHOUT
    // consuming RNG — so we mirror that branch here for events, but the RNG
    // contract still holds (no consumption on full immunity).
    const result = calculateDamage({
      attacker,
      defender,
      move,
      typeMultiplier: typeMult,
      rng,
    });

    // Event order per mover (Pattern 3): crit → effectiveness → damageDealt → hpChanged → fainted.
    if (result.crit) {
      events.push({ type: 'crit', side });
    }

    if (typeMult === 0) {
      events.push({ type: 'noEffect' });
    } else if (typeMult >= 2) {
      events.push({ type: 'superEffective', multiplier: typeMult });
    } else if (typeMult > 0 && typeMult < 1) {
      events.push({ type: 'notVeryEffective', multiplier: typeMult });
    }
    // typeMult === 1 → no effectiveness event.

    const defenderSide: Side = isPlayerMover ? 'enemy' : 'player';
    const defenderHpBefore = defenderSide === 'player' ? playerHp : enemyHp;
    const newHp = Math.max(0, defenderHpBefore - result.damage);

    events.push({ type: 'damageDealt', side: defenderSide, amount: result.damage });
    events.push({
      type: 'hpChanged',
      side: defenderSide,
      from: defenderHpBefore,
      to: newHp,
      max: defender.maxHp,
    });

    if (defenderSide === 'player') {
      playerHp = newHp;
    } else {
      enemyHp = newHp;
    }

    if (newHp === 0) {
      events.push({ type: 'fainted', side: defenderSide });
    }
  }

  // Commit HP changes + bookkeeping in one Immer pass.
  return produce(state, (draft) => {
    draft.combatants.player.hp = playerHp;
    draft.combatants.enemy.hp = enemyHp;
    draft.pendingPlayerAction = null;
    draft.turnNumber = state.turnNumber + 1;
    draft.phase = 'animatingPlayer';
  });
}

function handleTurnEnd(
  state: BattleState,
  events: BattleEvent[],
): BattleState {
  // turnNumber was incremented in handleResolving; the turn that just ended
  // is the previous one.
  events.push({ type: 'turnEnd', turnNumber: state.turnNumber - 1 });
  return advance(state, 'faintCheck');
}

function handleFaintCheck(
  state: BattleState,
  events: BattleEvent[],
): BattleState {
  // Phase-2 1v1: a fainted combatant means battleOver immediately — no
  // forceSwitch path (no party). Phase 5 will add `if livingParty.length > 0
  // → forceSwitch`.
  if (state.combatants.player.hp === 0) {
    events.push({ type: 'battleEnded', winner: 'enemy' });
    return advance(state, 'battleOver');
  }
  if (state.combatants.enemy.hp === 0) {
    events.push({ type: 'battleEnded', winner: 'player' });
    return advance(state, 'battleOver');
  }
  // Both alive — start next turn.
  return advance(state, 'selecting');
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function advance(state: BattleState, nextPhase: BattlePhase): BattleState {
  return produce(state, (draft) => {
    draft.phase = nextPhase;
  });
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
