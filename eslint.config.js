// eslint.config.js — flat config (ESLint 9)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/data/*.json', 'coverage', '.cache'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // Allow `any` and unused-vars relaxation in test files (jest-dom matchers etc.)
  {
    files: ['tests/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // ENGINE PURITY (FOUND-05, D-14) — applies only to src/engine/**
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'Engine must not import React.' },
            { name: 'react-dom', message: 'Engine must not import React DOM.' },
          ],
          patterns: [
            { group: ['react/*', 'react-dom/*'], message: 'Engine must not import React.' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'Engine must use the seedable RNG, not Math.random.',
        },
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: 'Engine must not depend on wall-clock time.',
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'Engine must not construct Date objects.',
        },
      ],
    },
  },
);
