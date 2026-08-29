// ============================================================
// ESLint — application web
//
// Le script `lint` existait mais aucune configuration n'accompagnait
// ESLint : la tâche échouait avant d'analyser quoi que ce soit.
//
// Principe retenu : ESLint ne double pas TypeScript. Ce que `tsc`
// détecte déjà (variables inutilisées, types incompatibles) est
// désactivé ici. ESLint sert à ce que le compilateur ne voit pas :
// dépendances de hooks, égalités laxistes, oublis d'`await`.
// ============================================================

import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  {
    // `icons.generated.ts` est produit par scripts/build-icons.mjs :
    // le relire ne dirait rien sur le code écrit à la main.
    ignores: ['dist', 'node_modules', '.tsbuild', 'coverage',
              'src/components/ui/icons.generated.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
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

      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Doublons de `tsc --noEmit`, déjà bloquant en CI.
      '@typescript-eslint/no-unused-vars': 'off',

      // `any` reste présent dans le code hérité de Firestore ; on le
      // signale sans bloquer, il disparaîtra avec la bascule Supabase.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Ce que le compilateur ne voit pas.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  // Les données de démonstration contiennent volontairement des
  // valeurs en dur et des `console.log` de progression.
  {
    files: ['**/seed.service.ts', '**/*.config.ts'],
    rules: { 'no-console': 'off' },
  },
  // Les scripts de build tournent sous Node, pas dans le navigateur :
  // `console` et `process` y sont légitimes.
  {
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
      // Un membre extrait puis écarté par déstructuration se nomme `_x`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
    },
  }
)
