module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/server/__tests__/setup.ts'],
  collectCoverageFrom: [
    'server/services/**/*.ts',
    'server/utils/**/*.ts',
    'server/middleware/**/*.ts',
    '!server/dist/**',
    '!server/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
};
