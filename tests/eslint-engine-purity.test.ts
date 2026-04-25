import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

/**
 * FOUND-05 / D-14: ESLint must block forbidden imports and forbidden APIs
 * inside `src/engine/**`.
 *
 * We lint a string fixture pretending to live at `src/engine/fixture.ts`
 * by passing the filename to ESLint. (ESLint resolves config based on filename,
 * not on the actual physical location of the source we hand it.)
 */
async function lintFixture(content: string): Promise<ESLint.LintResult> {
  const eslint = new ESLint();
  const results = await eslint.lintText(content, {
    filePath: 'src/engine/fixture.ts',
  });
  const first = results[0];
  if (results.length !== 1 || !first) throw new Error('expected exactly one lint result');
  return first;
}

describe('engine purity (FOUND-05, D-14)', () => {
  it('blocks `import { useState } from "react"` in src/engine/**', async () => {
    const result = await lintFixture(
      `import { useState } from 'react';\nexport const x = useState;\n`,
    );
    const restricted = result.messages.find((m) => m.ruleId === 'no-restricted-imports');
    expect(restricted, JSON.stringify(result.messages, null, 2)).toBeDefined();
  });

  it('blocks `import "react-dom/client"` in src/engine/**', async () => {
    const result = await lintFixture(`import 'react-dom/client';\nexport const y = 1;\n`);
    const restricted = result.messages.find((m) => m.ruleId === 'no-restricted-imports');
    expect(restricted).toBeDefined();
  });

  it('blocks `Math.random()` in src/engine/**', async () => {
    const result = await lintFixture(`export const r = () => Math.random();\n`);
    const restricted = result.messages.find((m) => m.ruleId === 'no-restricted-syntax');
    expect(restricted).toBeDefined();
  });

  it('blocks `Date.now()` in src/engine/**', async () => {
    const result = await lintFixture(`export const t = () => Date.now();\n`);
    const restricted = result.messages.find((m) => m.ruleId === 'no-restricted-syntax');
    expect(restricted).toBeDefined();
  });

  it('blocks `new Date()` in src/engine/**', async () => {
    const result = await lintFixture(`export const d = () => new Date();\n`);
    const restricted = result.messages.find((m) => m.ruleId === 'no-restricted-syntax');
    expect(restricted).toBeDefined();
  });

  it('allows pure TS without React or wall-clock APIs in src/engine/**', async () => {
    const result = await lintFixture(
      `export function add(a: number, b: number): number {\n  return a + b;\n}\n`,
    );
    const restricted = result.messages.filter(
      (m) => m.ruleId === 'no-restricted-imports' || m.ruleId === 'no-restricted-syntax',
    );
    expect(restricted, JSON.stringify(result.messages, null, 2)).toEqual([]);
  });
});
