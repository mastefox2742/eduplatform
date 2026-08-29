// ============================================================
// Jest — Cloud Functions
//
// Sans configuration, Jest ramassait deux fois les mêmes tests :
// une fois dans `src/` (échec, faute de transformation TypeScript)
// et une fois dans `lib/` (le résultat de compilation). La suite
// affichait « 1 failed, 1 passed » pour un seul jeu de tests.
//
// On ne teste que les sources, avec ts-jest.
// ============================================================

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  // `lib/` contient la compilation : la scanner double chaque test.
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { esModuleInterop: true } }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/types/**',
  ],
  clearMocks: true,
}
