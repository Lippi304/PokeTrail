import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Multi-environment test setup lives in `vitest.workspace.ts` (Vitest 2 standard).
// This root config only carries the path alias so editors and Vitest CLI agree.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
