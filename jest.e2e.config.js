/** @type {import('jest').Config} */
export default {
  // Extends the base configuration
  ...await import('./jest.config.js').then(m => m.default),

  // Specific E2E test configuration
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.js'
  ],

  // E2E tests might need even longer timeout
  testTimeout: 60000,

  // Additional setup for E2E tests
  setupFiles: [
    '<rootDir>/tests/e2e/setup.js'
  ],

  // More lenient coverage for E2E tests
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },

  // Might need specific environment setup
  testEnvironment: 'node'
};
