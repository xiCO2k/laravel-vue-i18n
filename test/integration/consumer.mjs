import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { build, createServer } from 'vite'
import i18n from 'laravel-vue-i18n/vite'
import { I18n } from 'laravel-vue-i18n'

const require = createRequire(import.meta.url)
const profile = process.argv[2]
const cli = profile === 'plus' ? 'node_modules/vite-plus/bin/vp' : 'node_modules/vite/bin/vite.js'
execFileSync(process.execPath, [cli, 'build'], { stdio: 'pipe' })
execFileSync(process.execPath, ['browser.mjs'], { stdio: 'pipe' })
assert.equal(typeof require('laravel-vue-i18n').I18n, 'function')
assert.equal(typeof require('laravel-vue-i18n/vite').default, 'function')
assert.equal(typeof I18n, 'function')

await build({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  plugins: [i18n()],
  build: { ssr: 'ssr.js', outDir: 'ssr-dist' }
})
const ssr = await import(pathToFileURL(path.resolve('ssr-dist/ssr.js')))
assert.equal(ssr.actual, 'PHP_TRANSLATION / JSON_TRANSLATION')

fs.writeFileSync(
  'types.mts',
  `
import {defineConfig} from 'vite';
import i18n from 'laravel-vue-i18n/vite';
import {createApp} from 'vue';
import {i18nVue, I18n} from 'laravel-vue-i18n';
import type {OptionsInterface} from 'laravel-vue-i18n/interfaces/options';
defineConfig({plugins:[i18n(),i18n('lang'),i18n({additionalLangPaths:['locales']})]});
createApp({}).use(i18nVue, {lang:'en',resolve:async lang=>({default:{hello:lang}})});
createApp({}).use(i18nVue, {resolve:lang=>({hello:lang})});
const options: OptionsInterface={resolve:lang=>({hello:lang})};
new I18n(options);
// @ts-expect-error language must be a string
createApp({}).use(i18nVue, {lang:123});
`
)
fs.writeFileSync(
  'types.cts',
  `
import runtime = require('laravel-vue-i18n');
import plugin = require('laravel-vue-i18n/vite');
new runtime.I18n({resolve:lang=>({hello:lang})});
plugin.default();
`
)
fs.writeFileSync(
  'types-legacy.ts',
  `
import {createApp} from 'vue';
import {i18nVue, I18n} from 'laravel-vue-i18n';
import type {OptionsInterface} from 'laravel-vue-i18n/interfaces/options';
const options: OptionsInterface = {resolve:lang=>({hello:lang})};
new I18n(options);
createApp({}).use(i18nVue, options);
` + (profile === '4' ? "import i18n from 'laravel-vue-i18n/vite'; i18n();" : '')
)
for (const [module, moduleResolution, files] of [
  ['NodeNext', 'NodeNext', ['types.mts', 'types.cts']],
  ['ESNext', 'Bundler', ['types.mts']],
  ['CommonJS', 'Node', ['types-legacy.ts']]
]) {
  fs.writeFileSync(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        noEmit: true,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        target: 'ES2022',
        module,
        moduleResolution
      },
      files
    })
  )
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { stdio: 'pipe' })
  if (profile === '8' && moduleResolution !== 'Node') {
    execFileSync(process.execPath, ['node_modules/typescript-current/bin/tsc', '-p', 'tsconfig.json'], {
      stdio: 'pipe'
    })
  }
  if (profile === '4' && moduleResolution === 'Node') {
    execFileSync(process.execPath, ['node_modules/typescript-legacy/bin/tsc', '-p', 'tsconfig.json'], { stdio: 'pipe' })
  }
}
const php = (text) => "<?php return ['hello'=>'" + text + "'];"
fs.mkdirSync('locales/en', { recursive: true })
fs.writeFileSync('locales/en/extra.php', php('EXTRA'))
const listeners = process.listenerCount('exit')
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  plugins: [i18n({ additionalLangPaths: ['locales'] })],
  server: { port: 0 },
  optimizeDeps: { noDiscovery: true, include: [] }
})
const read = (locale = 'en') => {
  try {
    return JSON.parse(fs.readFileSync('lang/php_' + locale + '.json', 'utf8'))
  } catch {
    return {}
  }
}
const waitFor = async (check) => {
  const deadline = Date.now() + 5000
  while (!check() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25))
  assert(check(), 'Timed out waiting for translation update')
}
try {
  await server.listen()
  // The production fixture imports .vue; dev watching only needs the glob module.
  await server.transformRequest('/ssr.js')
  await waitFor(() => Object.values(server.watcher.getWatched()).some((files) => files.includes('extra.php')))
  fs.writeFileSync('locales/en/extra.php', php('CHANGED'))
  await waitFor(() => read()['extra.hello'] === 'CHANGED')
  fs.writeFileSync('lang/en/new.php', php('CREATED'))
  await waitFor(() => read()['new.hello'] === 'CREATED')
  fs.unlinkSync('lang/en/new.php')
  await waitFor(() => !('new.hello' in read()))
  fs.mkdirSync('lang/fr', { recursive: true })
  fs.writeFileSync('lang/fr/messages.php', php('FRENCH'))
  await waitFor(() => read('fr')['messages.hello'] === 'FRENCH')
  fs.rmSync('lang/fr', { recursive: true })
  await waitFor(() => !fs.existsSync('lang/php_fr.json'))
} finally {
  await server.close()
}
assert.equal(process.listenerCount('exit'), listeners)
assert(!fs.existsSync('lang/php_en.json'))
if (process.platform !== 'win32') {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    const child = spawn(
      process.execPath,
      [cli, ...(profile === 'plus' ? ['dev'] : []), '--host', '127.0.0.1', '--port', '0'],
      {
        stdio: 'ignore',
        detached: true,
        env: { ...process.env, CI: 'true', LARAVEL_BYPASS_ENV_CHECK: '1' }
      }
    )
    const stopped = once(child, 'exit')
    let cleaned = false
    try {
      await waitFor(() => fs.existsSync('lang/php_en.json'))
      // Vite+ launches a child process. Signal the foreground process group, as a terminal does.
      process.kill(-child.pid, signal)
      await Promise.race([
        stopped,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Dev server did not stop')), 5000).unref())
      ])
      await waitFor(() => !fs.existsSync('lang/php_en.json'))
      cleaned = true
    } finally {
      if (!cleaned) {
        try {
          process.kill(-child.pid, 'SIGKILL')
        } catch (error) {
          if (error.code !== 'ESRCH') throw error
        }
      }
      await stopped
    }
  }
}
console.log(
  'PASS ' +
    (profile === 'plus'
      ? 'Vite+ ' + require('vite-plus/package.json').version
      : 'Vite ' + require('vite/package.json').version) +
    ': client rendering, SSR, ESM/CJS, types, translation watching, cleanup.'
)
