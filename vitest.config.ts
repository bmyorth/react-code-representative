import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

/**
 * Configuración de tests. Reutiliza la de Vite (alias `@/`, plugin de React)
 * para que los tests resuelvan el código exactamente igual que la app.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      unstubEnvs: true,
      css: { modules: { classNameStrategy: 'non-scoped' } },
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.stories.tsx',
          'src/**/*.test.{ts,tsx}',
          'src/test/**',
          'src/**/testing/**',
          'src/mocks/**',
          'src/main.tsx',
          'src/vite-env.d.ts',
        ],
        reporter: ['text', 'html', 'lcov'],
        // El dominio es lógica pura: se exige cobertura total.
        thresholds: {
          'src/features/*/domain/**': {
            statements: 100,
            branches: 100,
            functions: 100,
            lines: 100,
          },
        },
      },
    },
  }),
);
