import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import reactPerfPlugin from 'eslint-plugin-react-perf';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // 1. Global ignores
  { ignores: ['dist', 'node_modules', '.storybook', 'storybook-static', 'coverage'] },

  // 2. Base JS recommended
  js.configs.recommended,

  // 3. TypeScript type-aware rules (scoped to TS files)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser },
    },
  },

  // 4. React + Hooks + A11y + Import sorting + Perf
  {
    files: ['src/**/*.{ts,tsx}'],

    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'react-refresh': reactRefreshPlugin,
      'react-perf': reactPerfPlugin,
      'simple-import-sort': simpleImportSortPlugin,
    },

    languageOptions: {
      globals: { ...globals.browser },
    },

    settings: {
      react: { version: 'detect' },
      'jsx-a11y': {
        components: {
          Button: 'button',
          DataGrid: 'table',
          TableHeader: 'thead',
          TableRow: 'tr',
          SidebarNav: 'nav',
          DashboardLink: 'a',
          Modal: 'dialog',
        },
      },
    },

    rules: {
      // --- React: essential correctness ---
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'warn',
      'react/jsx-key': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/jsx-uses-vars': 'error',

      // --- React Hooks ---
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // --- JSX A11y (recommended subset) ---
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/scope': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/tabindex-no-positive': 'warn',

      // --- Import sorting ---
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react', '^@?\\w'],
            ['^@(/.*|$)'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.s?css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      // --- Performance (educational, off in CI) ---
      'react-perf/jsx-no-new-function-as-prop': 'off',
      'react-perf/jsx-no-new-object-as-prop': 'off',
      'react-perf/jsx-no-new-array-as-prop': 'off',

      // --- Vite HMR ---
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // --- TypeScript overrides ---
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-deprecated': 'off',           // React 18: JSX namespace is not deprecated
      '@typescript-eslint/no-misused-promises': 'error',   // Keep error but allow checks on JSX attrs
      '@typescript-eslint/unbound-method': 'off',          // Test mocks need unbound methods
      '@typescript-eslint/no-unsafe-assignment': 'off',    // Axios interceptor typing limitation
      '@typescript-eslint/no-unsafe-member-access': 'off', // Axios interceptor typing limitation
      '@typescript-eslint/restrict-template-expressions': 'warn',

      // Disable rules conflicting with Prettier
      '@typescript-eslint/no-extra-semi': 'off',
    },
  },

  // 5. Test and Storybook overrides
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/*.stories.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-perf/jsx-no-new-function-as-prop': 'off',
      'react-perf/jsx-no-new-object-as-prop': 'off',
      'react-perf/jsx-no-new-array-as-prop': 'off',
      'simple-import-sort/imports': 'off',
    },
  },

  // 6. Prettier compatibility (MUST be last)
  prettier,
);
