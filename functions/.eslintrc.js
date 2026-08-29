// ============================================================
// ESLint — Cloud Functions
//
// `pnpm lint` echouait : aucune configuration n'existait, et ESLint
// remontait jusqu'au dossier personnel avant d'abandonner. Il
// analysait aussi `lib/`, qui est le resultat de compilation.
// ============================================================

module.exports = {
  root: true,
  env: { node: true, es2022: true, jest: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['lib/**', 'node_modules/**', '*.js'],
  rules: {
    // Deja couvert par `tsc --noEmit`, bloquant en CI.
    '@typescript-eslint/no-unused-vars': 'off',
    // Le code Firestore herite manipule beaucoup de `any` ; il
    // disparaitra avec la bascule Supabase.
    '@typescript-eslint/no-explicit-any': 'warn',
    // Ce que le compilateur ne voit pas.
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-throw-literal': 'error',
  },
}
