module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@angular/core$': '<rootDir>/src/test-helpers/angular-core.mock.ts',
    '^@angular/core/rxjs-interop$': '<rootDir>/src/test-helpers/angular-rxjs-interop.mock.ts',
    '^@angular/common/http$': '<rootDir>/src/test-helpers/angular-http.mock.ts',
    '^@angular/router$': '<rootDir>/src/test-helpers/angular-router.mock.ts',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(test).ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
};