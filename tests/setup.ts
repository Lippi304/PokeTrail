import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL 16 + Vitest 2 do not auto-cleanup (no global `afterEach` is wired by RTL).
// Without this, mounted nodes from earlier `render()` calls leak into the next
// test, breaking single-element queries like `getByRole('button')`.
afterEach(() => {
  cleanup();
});
