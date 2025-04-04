/** @type {import('jest').Config} */
export default {
  // Indicates the root directory of the project
  rootDir: '.',

  // Tells Jest which files to test
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/src/**/*.test.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Modules and transformations
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Module path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Test environment
  testEnvironment: 'node',

  // Additional configuration
  verbose: true,
  
  // Ignore specific paths
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ]
};
