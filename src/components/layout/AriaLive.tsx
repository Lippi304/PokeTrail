// src/components/layout/AriaLive.tsx
// A11Y-04: Battle log uses aria-live="polite" so screen readers announce new messages.
// Phase 1 ships only the pattern — Phase 4 wires the actual battle log content here.
import type { ReactNode } from 'react';

export function AriaLive({ children }: { children?: ReactNode }) {
  // TODO(Phase 4 / BATT-04): Wire up the rolling 8-message battle log.
  // Use this component as the live region — the role + aria-live attributes
  // are the contract; content updates inside the region are announced.
  return (
    <div role="log" aria-live="polite" aria-atomic="false">
      {children}
    </div>
  );
}
