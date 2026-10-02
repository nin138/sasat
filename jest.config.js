// Keep clock-dependent tests deterministic across developer machines and CI.
process.env.TZ = "UTC";

export default {
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testMatch: ["**/__tests__/**/*.+(ts|tsx|js)", "**/?(*.)+(spec|test).+(ts|tsx|js)"],
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
  transformIgnorePatterns: ["/node_modules/(?!chalk/)"],
  moduleNameMapper: {
    "^sasat$": "<rootDir>/src/index.ts",
    "^sasat/(migration|testing)$": "<rootDir>/src/$1/index.ts",
    "^@/(.*)\\.js$": "<rootDir>/src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.test.ts"],
  coverageReporters: ["text-summary", "lcov", "json-summary"],
};
