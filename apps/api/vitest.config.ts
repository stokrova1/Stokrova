import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    teardownTimeout: 30000,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
