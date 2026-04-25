// Vitest 2 workspace — splits engine (node env, fast) from ui (jsdom env).
// Each entry is a self-contained Vite config and is the canonical way to
// configure multi-environment test runs in Vitest 2.x.
import { defineWorkspace } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const alias = { '@': path.resolve(__dirname, './src') };

export default defineWorkspace([
  {
    resolve: { alias },
    test: {
      name: 'engine',
      include: ['src/engine/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    plugins: [react()],
    resolve: { alias },
    test: {
      name: 'ui',
      include: ['src/components/**/*.test.tsx', 'tests/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
    },
  },
]);
