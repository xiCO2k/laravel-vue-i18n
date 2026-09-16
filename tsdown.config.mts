import { defineConfig } from 'tsdown'
import type { UserConfig } from 'tsdown'
import { copyDeclarations } from './scripts/legacy-types.mjs'

const common = {
  entry: ['src/**/*.ts'],
  root: 'src',
  unbundle: true,
  fixedExtension: true,
  cjsDefault: false,
  platform: 'neutral' as const,
  dts: { sourcemap: true },
  sourcemap: true,
  deps: { neverBundle: true }
} satisfies UserConfig

export default defineConfig([
  { ...common, format: 'esm', target: 'es2020' },
  {
    ...common,
    format: 'cjs',
    target: 'es2015',
    define: { 'import.meta.env': '(typeof process === "undefined" ? undefined : process.env)' },
    hooks: { 'build:done': () => copyDeclarations() }
  }
])
