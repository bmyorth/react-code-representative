import { type StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook reutiliza `vite.config.ts` (alias `@/`, CSS Modules), así que los
 * componentes se renderizan igual que en la app.
 */
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  core: { disableTelemetry: true },
};

export default config;
