/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@shop-finance/shared$': '<rootDir>/../packages/shared/src',
  },
  testTimeout: 30000,
};
