// src/engine/typeChart.ts
// Pure type-chart lookup. The chart is passed in as a parameter so the engine
// has ZERO coupling to src/data/** — plan 02 (engine) and plan 03 (data) can
// run in parallel, and the engine stays trivially testable with fixture charts.
import type { GenOneType, TypeChart } from './types';

/**
 * Returns the multiplicative type-effectiveness multiplier of `moveType`
 * against a (single- or dual-type) defender.
 *
 * - Single-type: returns `chart[moveType][defender[0]]`.
 * - Dual-type: returns the product of both cells (`2 * 2 = 4`, `2 * 0.5 = 1`, etc.).
 * - Throws if any of the participating types is missing from the chart.
 *   (Better to crash loudly than to silently default to 1× and ship wrong damage.)
 */
export function getTypeMultiplier(
  moveType: GenOneType,
  defenderTypes: readonly GenOneType[],
  chart: TypeChart,
): number {
  const row = chart[moveType];
  // The TS index signature returns `Record<GenOneType, ...>` so `row` is
  // typed as non-undefined, but at runtime a malformed chart can still be
  // missing entries. Guard explicitly.
  if (row === undefined) {
    throw new Error(`Unknown move type: ${moveType}`);
  }
  let mult = 1;
  for (const dt of defenderTypes) {
    const cell = row[dt];
    if (cell === undefined) {
      throw new Error(`Unknown defender type: ${dt}`);
    }
    mult *= cell;
  }
  return mult;
}
