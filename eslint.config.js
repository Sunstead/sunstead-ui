import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Mirrors the Atlas and Cosmos configs, so the apps compiling this source
// lint it the same way.
export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Empty catch blocks are deliberate: localStorage access must never
      // break a render.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['*.config.{js,ts}', 'src/**/*.test.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // Vendored shadcn primitives, listed last so these win. The shadcn CLI
    // regenerates them, so rewriting them for the React Compiler rules would
    // be undone by the next `shadcn add`.
    files: ['src/components/ui/**'],
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
);
