// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { build, createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import i18n from '../src/vite'

const roots: string[] = []
const servers: ViteDevServer[] = []
const php = (value: string) => `<?php return ['hello' => '${value}'];`
const put = (root: string, file: string, value: string) => {
  const target = path.join(root, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, value)
}
const fixture = () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'laravel-vue-i18n-')))
  roots.push(root)
  put(root, 'main.js', "export const translations = import.meta.glob('./lang/*.json', { eager: true });")
  return root
}
const messages = (root: string, locale = 'en') => {
  const file = path.join(root, 'lang/php_' + locale + '.json')
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
}
const compile = async (root: string, options: Parameters<typeof i18n>[0] = {}) => {
  const result = await build({
    configFile: false,
    root,
    logLevel: 'silent',
    plugins: [i18n(options)],
    build: { write: false, lib: { entry: path.join(root, 'main.js'), formats: ['es'] } }
  })
  return (Array.isArray(result) ? result : [result])
    .flatMap((bundle: any) => bundle.output)
    .filter((file: any) => file.type === 'chunk')
    .map((file: any) => file.code)
    .join('\n')
}
const start = async (root: string, options: Parameters<typeof i18n>[0] = {}) => {
  const server = await createServer({
    configFile: false,
    root,
    logLevel: 'silent',
    plugins: [i18n(options)],
    server: { port: 0 },
    optimizeDeps: { noDiscovery: true, include: [] }
  })
  servers.push(server)
  await server.listen()
  await server.transformRequest('/main.js')
  await vi.waitFor(() => expect(Object.keys(server.watcher.getWatched())).toContain(path.join(root, 'lang')))
  return server
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
  roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true }))
})

it('builds nested-only translations relative to Vite root and cleans its output', async () => {
  const root = fixture()
  put(root, 'lang/en/nested/messages.php', php('NESTED_TRANSLATION'))
  expect(await compile(root)).toContain('NESTED_TRANSLATION')
  expect(fs.existsSync(path.join(root, 'lang/php_en.json'))).toBe(false)
})

it('builds additional-only translations and preserves path priority', async () => {
  const root = fixture()
  put(root, 'locales/en/messages.php', php('ADDITIONAL_TRANSLATION'))
  put(root, 'overrides/en/messages.php', php('OVERRIDE_TRANSLATION'))
  const code = await compile(root, { additionalLangPaths: ['locales', 'overrides'] })
  expect(code).toContain('OVERRIDE_TRANSLATION')
  expect(code).not.toContain('ADDITIONAL_TRANSLATION')
  expect(fs.existsSync(path.join(root, 'lang'))).toBe(false)
})

it('retains existing files and directories when cleaning up', async () => {
  const root = fixture()
  put(root, 'lang/en/messages.php', php('NEW_TRANSLATION'))
  put(root, 'lang/php_en.json', '{"original":"keep me"}')
  put(root, 'lang/en.json', '{"hello":"JSON_TRANSLATION"}')
  await compile(root)
  expect(messages(root)).toEqual({ original: 'keep me' })
  expect(fs.existsSync(path.join(root, 'lang/en.json'))).toBe(true)
})

it('keeps JSON-only configurations free of generated files and global environment changes', async () => {
  const root = fixture()
  const original = process.env.VITE_LARAVEL_VUE_I18N_HAS_PHP
  put(root, 'lang/en.json', '{"hello":"JSON_ONLY"}')
  expect(await compile(root)).toContain('JSON_ONLY')
  expect(fs.readdirSync(path.join(root, 'lang'))).toEqual(['en.json'])
  expect(process.env.VITE_LARAVEL_VUE_I18N_HAS_PHP).toBe(original)
})

it('regenerates configured paths on changes, additions, and deletions and reloads the app', async () => {
  const root = fixture()
  put(root, 'lang/en/messages.php', php('INITIAL'))
  put(root, 'locales/en/extra.php', php('EXTRA_INITIAL'))
  const server = await start(root, { additionalLangPaths: ['locales'] })
  const send = vi.spyOn(server.ws, 'send')
  await vi.waitFor(() => expect(server.watcher.getWatched()[path.join(root, 'locales/en')]).toContain('extra.php'))

  put(root, 'locales/en/extra.php', php('EXTRA_CHANGED'))
  await vi.waitFor(() => expect(messages(root)['extra.hello']).toBe('EXTRA_CHANGED'))

  put(root, 'lang/en/created.php', php('CREATED'))
  await vi.waitFor(() => expect(messages(root)['created.hello']).toBe('CREATED'))

  fs.unlinkSync(path.join(root, 'lang/en/created.php'))
  await vi.waitFor(() => expect(messages(root)['created.hello']).toBeUndefined())
  expect(send).toHaveBeenCalledWith({ type: 'full-reload', path: '*' })
})

it('watches absolute paths outside the Vite root', async () => {
  const root = fixture()
  const external = fixture()
  put(root, 'lang/en.json', '{}')
  put(external, 'translations/en/messages.php', php('EXTERNAL_INITIAL'))
  const server = await start(root, { additionalLangPaths: [path.join(external, 'translations')] })
  await vi.waitFor(() =>
    expect(server.watcher.getWatched()[path.join(external, 'translations/en')]).toContain('messages.php')
  )
  put(external, 'translations/en/messages.php', php('EXTERNAL_CHANGED'))
  await vi.waitFor(() => expect(messages(root)['messages.hello']).toBe('EXTERNAL_CHANGED'))
})

it('picks up the first PHP file and removes a deleted locale', async () => {
  const root = fixture()
  put(root, 'lang/en.json', '{}')
  await start(root)
  put(root, 'lang/fr/messages.php', php('FIRST_TRANSLATION'))
  await vi.waitFor(() => expect(messages(root, 'fr')['messages.hello']).toBe('FIRST_TRANSLATION'))
  fs.rmSync(path.join(root, 'lang/fr'), { recursive: true })
  await vi.waitFor(() => expect(fs.existsSync(path.join(root, 'lang/php_fr.json'))).toBe(false))
})

it('removes listeners and generated files after repeated server starts', async () => {
  const root = fixture()
  put(root, 'lang/en/messages.php', php('INITIAL'))
  const listeners = ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP'].map((signal) => process.listenerCount(signal))
  for (let count = 0; count < 2; count++) {
    const server = await start(root)
    expect(messages(root)['messages.hello']).toBe('INITIAL')
    await server.close()
    expect(['exit', 'SIGINT', 'SIGTERM', 'SIGHUP'].map((signal) => process.listenerCount(signal))).toEqual(listeners)
    expect(fs.existsSync(path.join(root, 'lang/php_en.json'))).toBe(false)
  }
})

it('keeps files alive while another server or build still consumes them', async () => {
  const root = fixture()
  put(root, 'lang/en/messages.php', php('SHARED_TRANSLATION'))
  const first = await start(root)
  const second = await start(root)
  expect(await compile(root)).toContain('SHARED_TRANSLATION')
  expect(messages(root)['messages.hello']).toBe('SHARED_TRANSLATION')
  await first.close()
  expect(messages(root)['messages.hello']).toBe('SHARED_TRANSLATION')
  await second.close()
  expect(fs.existsSync(path.join(root, 'lang/php_en.json'))).toBe(false)
})

it('cleans generated files after a failed build', async () => {
  const root = fixture()
  put(root, 'lang/en/messages.php', php('INITIAL'))
  put(root, 'main.js', "import './missing.js'")
  await expect(compile(root)).rejects.toThrow()
  expect(fs.existsSync(path.join(root, 'lang/php_en.json'))).toBe(false)
})

it('recovers when invalid PHP is fixed immediately after an error', async () => {
  const root = fixture()
  put(root, 'lang/en/messages.php', php('INITIAL'))
  const server = await start(root)
  const send = vi.spyOn(server.ws, 'send').mockImplementation((payload: unknown) => {
    if (typeof payload === 'object' && payload !== null && 'type' in payload && payload.type === 'error') {
      // Save the correction as soon as the error is reported.
      put(root, 'lang/en/messages.php', php('RECOVERED'))
    }
  })
  put(root, 'lang/en/messages.php', '<?php return [')
  await vi.waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' })))
  await vi.waitFor(() => expect(messages(root)['messages.hello']).toBe('RECOVERED'))
})

it('rebuilds watched PHP inputs and cleans when the build watcher closes', { timeout: 15000 }, async () => {
  const root = fixture()
  put(root, 'lang/en/messages.php', php('WATCH_INITIAL'))
  const watcher: any = await build({
    configFile: false,
    root,
    logLevel: 'silent',
    plugins: [i18n()],
    build: {
      watch: {},
      lib: { entry: path.join(root, 'main.js'), formats: ['es'], fileName: () => 'translations.mjs' }
    }
  })
  const output = path.join(root, 'dist/translations.mjs')
  const code = () => (fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : '')
  try {
    await vi.waitFor(() => expect(code()).toContain('WATCH_INITIAL'), { timeout: 3000 })
    put(root, 'lang/en/messages.php', php('WATCH_CHANGED'))
    await vi.waitFor(() => expect(code()).toContain('WATCH_CHANGED'), { timeout: 3000 })
  } finally {
    await watcher.close()
  }
  expect(fs.existsSync(path.join(root, 'lang/php_en.json'))).toBe(false)
})
