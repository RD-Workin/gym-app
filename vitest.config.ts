import { defineConfig } from 'vitest/config';

// Config séparée de vite.config.ts : pas de plugin PWA pendant les tests.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
});
