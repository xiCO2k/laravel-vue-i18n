import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import viteTsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [vue(), viteTsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
  },
});
