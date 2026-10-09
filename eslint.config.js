// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsdoc from 'eslint-plugin-jsdoc';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'storybook-static', 'public/mockServiceWorker.js'] },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      jsdoc.configs['flat/recommended-typescript-error'],
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // JSDoc: toda función, clase o tipo exportado se documenta. Los tipos ya los aporta
      // TypeScript, así que no se exige repetir cada parámetro ni el valor de retorno.
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: { FunctionDeclaration: true, ClassDeclaration: true },
          contexts: [
            'ExportNamedDeclaration > VariableDeclaration',
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
          ],
        },
      ],
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
      // Las features solo se comunican entre sí a través de su API pública (index.ts).
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message: 'Importa la feature desde su API pública: "@/features/<feature>".',
            },
          ],
        },
      ],
    },
  },

  // La capa de dominio es TypeScript puro: sin React, sin red, sin librerías de UI.
  {
    files: ['src/features/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', '@tanstack/*', 'zustand', 'zustand/*', 'msw', 'msw/*'],
              message: 'El dominio no puede depender de frameworks ni de infraestructura.',
            },
            {
              group: ['../application/*', '../infrastructure/*', '../ui/*', '@/app/*'],
              message: 'El dominio no depende de capas externas.',
            },
          ],
        },
      ],
    },
  },

  // Tests: Vitest + Testing Library. Se documentan con `describe`/`it`, no con JSDoc.
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
    },
  },

  // Historias de Storybook (CSF): exportan objetos, no componentes, y siguen sus propias reglas.
  ...storybook.configs['flat/recommended'],
  {
    files: ['src/**/*.stories.tsx', '.storybook/**'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },

  // Backend local: corre en Node, no en el navegador, y los tests se documentan con describe/it.
  {
    files: ['server/**/*.ts', 'vitest.server.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // Los tests del backend leen JSON de respuestas sin tipar: las reglas `no-unsafe-*` solo añaden ruido.
    files: ['server/**/*.test.ts', 'server/testing/**'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  // Archivos de configuración en Node.
  {
    files: ['*.config.{js,ts}', '.storybook/main.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  prettier,
);
