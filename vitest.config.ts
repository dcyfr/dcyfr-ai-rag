// Self-contained Vitest configuration (no workspace-root imports).
// Inlined from vitest.config.base.ts at the workspace root.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/examples/**',
      ],
    },
    include: ['tests/**/*.test.ts'],
  },
});

