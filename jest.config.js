export default {
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {},
  testEnvironment: 'jest-environment-node',
  // https://kulshekhar.github.io/ts-jest/docs/next/guides/esm-support/
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapper: {
    "^sasat": "<rootDir>/lib",
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  "moduleFileExtensions": [
    "ts",
    "js"
  ],
  "coveragePathIgnorePatterns": [
    "/node_modules/",
    "<rootDir>/lib",
    "<rootDir>/test"
  ],
}

