// eslint.config.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import globals from 'globals';

import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

import prettier from 'eslint-config-prettier';
import expo from 'eslint-plugin-expo';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import unusedImports from 'eslint-plugin-unused-imports';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    // Files / dirs to ignore
    ignores: [
      'node_modules',
      'dist',
      'build',
      '.expo',
      'android',
      'ios',
      // config files we don't want typed-linted
      'babel.config.*',
      'tailwind.config.*',
      'metro.config.*',
      'jest.config.*',
      'postcss.config.*',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      globals: { ...globals.browser, ...globals.node, JSX: true },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks,
      'react-native': reactNative,
      import: importPlugin,
      'unused-imports': unusedImports,
      expo,
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.json'],
          alwaysTryTypes: true,
        },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts'] },
      },
      react: { version: 'detect' },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,

      // unused imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // import ordering: type imports first, then builtin, external, internal (aliases), then parent/sibling/index
      'import/order': [
        'warn',
        {
          groups: [
            'type', // 1) import type {...}
            'builtin', // 2) node builtin modules
            'external', // 3) 3rd-party packages (react, react-native, etc.)
            'internal', // 4) project internal (alias-resolved imports)
            'parent', // 5) ../
            'sibling', // 6) ./
            'index', // 7) ./index
            'object', // 8) import x = require('x') style (rare)
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          pathGroups: [
            // your project-specific aliases (matches your tsconfig paths)
            { pattern: '@api/**', group: 'internal', position: 'before' },
            { pattern: '@assets/**', group: 'internal', position: 'before' },
            { pattern: '@hooks/**', group: 'internal', position: 'before' },
            { pattern: '@features/**', group: 'internal', position: 'before' },
            { pattern: '@theme/**', group: 'internal', position: 'before' },
            { pattern: '@mocks/**', group: 'internal', position: 'before' },
            { pattern: '@components/**', group: 'internal', position: 'before' },
            { pattern: '@stores/**', group: 'internal', position: 'before' },
            // fallback catch-all for @/*
            { pattern: '@/**', group: 'internal', position: 'before' },
          ],
          // keep type-only imports classified as 'type' (don't let pathGroups reclassify them)
          pathGroupsExcludedImportTypes: ['type'],
        },
      ],

      // allow unresolved imports to be handled by TS (avoid noisy false positives)
      'import/no-unresolved': 'off',
      'import/no-named-as-default': 'off',

      // react / react-native rules
      'react/react-in-jsx-scope': 'off',
      'react/jsx-no-useless-fragment': ['warn', { allowExpressions: true }],
      'react-native/no-inline-styles': 'off',
      'react-native/no-raw-text': 'off',

      // TypeScript preferences
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',

      // small safety to encourage not mixing type and value imports in same statement
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ImportDeclaration[importKind='value'][specifiers.0.type='ImportSpecifier'][specifiers.0.importKind='type']",
          message:
            'Avoid mixing `import type` and value imports in the same declaration. Use `import type` for types.',
        },
      ],
    },
  },

  // Keep Prettier last
  prettier,
];
