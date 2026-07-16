/// <reference types="vitest" />
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  plugins: [angular({ jit: true, tsconfig: './tsconfig.spec.json' })],
  test: {
    globals: true,
    environment: 'happy-dom',
    // O pool 'forks' (default) acumula memoria do happy-dom entre arquivos e
    // segfaulta ao passar de ~24 specs. O pool 'threads' isola sem esse vazamento.
    pool: 'threads',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.ts', 'scripts/**/*.spec.ts'],
    server: {
      deps: {
        inline: [/@angular/, /@testing-library/, /@analogjs/],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      exclude: [
        'src/main.ts',
        'src/test-setup.ts',
        'src/test-polyfills.ts',
        'src/mocks/**',
        '**/*.config.ts',
      ],
    },
  },
  define: {
    'import.meta.vitest': mode !== 'production',
  },
}));
