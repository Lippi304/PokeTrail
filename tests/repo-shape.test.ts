import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

describe('repo shape (FOUND-07)', () => {
  it.each([
    '.gitignore',
    '.editorconfig',
    '.prettierrc',
    '.nvmrc',
    'README.md',
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'vitest.config.ts',
    'eslint.config.js',
    'index.html',
    'src/main.tsx',
    'src/App.tsx',
    'src/index.css',
  ])('contains %s', (file) => {
    expect(existsSync(file), `expected ${file} to exist at repo root`).toBe(true);
  });

  it('package.json pins versions per RESEARCH.md', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    expect(pkg.devDependencies.vite).toMatch(/^\^6/);
    expect(pkg.dependencies.react).toMatch(/^\^19/);
    expect(pkg.devDependencies.typescript).toMatch(/^\^5\.7/);
    expect(pkg.devDependencies.tailwindcss).toMatch(/^\^4/);
    expect(pkg.devDependencies.vitest).toMatch(/^\^2/);
    expect(pkg.dependencies.zod).toMatch(/^\^3/);
    expect(pkg.dependencies.immer).toMatch(/^\^10/);
    expect(pkg.engines.node).toBe('^20 || ^22');
  });

  it('.nvmrc pins Node 22', () => {
    expect(readFileSync('.nvmrc', 'utf-8').trim()).toBe('22');
  });
});
