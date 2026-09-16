import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    fileParallelism: false,
    coverage: { include: ['src/**/*.ts'], exclude: ['src/interfaces/**', 'src/mix.ts'] }
  }
})
