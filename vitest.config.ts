import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        plugins: [],
        test: {
          name: 'engine',
          include: ['src/engine/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'ui',
          include: ['src/components/**/*.test.tsx', 'tests/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['./tests/setup.ts'],
        },
      },
    ],
  },
});
