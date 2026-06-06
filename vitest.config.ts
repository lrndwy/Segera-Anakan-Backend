import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/modules/rob/**/*.ts'],
      reporter: ['text', 'json-summary'],
      reportOnFailure: true,
    },
  },
});
