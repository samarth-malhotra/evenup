import js from '@eslint/js';
import prettier from 'eslint-config-prettier'; // Prettier config import
import importPlugin from 'eslint-plugin-import';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import globals from 'globals';

import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

import expo from 'eslint-plugin-expo';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import unusedImports from 'eslint-plugin-unused-imports';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: [
      'node_modules',
      'dist',
      'build',
      '.expo',
      'android',
      'ios',
      'babel.config.*',
      'tailwind.config.*',
      'metro.config.*',
      'jest.config.*',
      'postcss.config.*',
      "src/theme/script/*", 
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
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
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
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
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
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
          fixStyle: 'separate-type-imports', // keeps type + value imports separate
        },
      ],
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
