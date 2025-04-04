/** @type {import('jest').Config} */
export default {
  // Extends the base configuration
  ...await import('./jest.config.js').then(m => m.default),

  // Specific integration test configuration
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.js'
  ],

  // Integration tests might need longer timeout
  testTimeout: 30000,

  // Additional setup for integration tests
  setupFiles: [
    '<rootDir>/tests/integration/setup.js'
  ],

  // Coverage might be different for integration tests
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
