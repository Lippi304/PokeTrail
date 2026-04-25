// src/hooks/useMoveHotkeys.ts
// A11Y-03: Number keys 1–4 trigger the corresponding move buttons in battle.
// Phase 1 ships only the API surface — Phase 4 wires the actual keydown listener
// inside the BattleScreen component (avoids leaking battle-only behavior into Phase 1).
//
// Usage (Phase 4):
//   const handlers: Array<() => void> = [
//     () => useMove(0), () => useMove(1), () => useMove(2), () => useMove(3),
//   ];
//   useMoveHotkeys(handlers);
import { useEffect } from 'react';

/**
 * Binds keys "1", "2", "3", "4" to the corresponding handler index.
 * Active only while the component is mounted; cleans up on unmount.
 *
 * Phase 1: stub. Phase 4 (BATT-02 / A11Y-03) implements the actual keydown wiring
 * — map event.key '1'..'4' → handlers[0..3], skip when modifier (Ctrl/Meta/Alt) is
 * held, skip when an input/textarea has focus (don't intercept typing).
 */
export function useMoveHotkeys(handlers: readonly (() => void)[]): void {
  useEffect(() => {
    // TODO(Phase 4 / BATT-02 / A11Y-03): implement keydown listener.
    void handlers;
  }, [handlers]);
}
