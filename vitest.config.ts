import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['packages/**/*.test.ts', 'apps/web/src/**/*.test.ts', 'server/src/**/*.test.ts'],
    environment: 'node',
  },
});
