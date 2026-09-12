import path from 'path'
import { existsSync, readFileSync, realpathSync, unlinkSync, readdirSync, rmdirSync, writeFileSync } from 'fs'
import { generateFiles, prepareExtendedParsedLangFiles } from './loader'
import type { VitePluginOptionsInterface } from './interfaces/plugin-options'
import type { Plugin, ViteDevServer } from 'vite'

interface GeneratedFile {
  owners: Set<symbol>
  original?: Buffer
}

interface GeneratedDirectory {
  owners: Set<symbol>
  files: Map<string, GeneratedFile>
  created: boolean
}

// Client and SSR builds in the same process may consume the same generated files.
const directories = new Map<string, GeneratedDirectory>()

const realPath = (file: string): string => {
  if (existsSync(file)) return realpathSync(file)
  const parent = path.dirname(file)
  return parent === file ? file : path.join(realPath(parent), path.basename(file))
}

export default function i18n(options: string | VitePluginOptionsInterface = 'lang'): Plugin {
  const settings = typeof options === 'string' ? { langPath: options } : options
  const owner = Symbol('i18n')
  let langPath: string
  let langPaths: string[] = []
  let ownedFiles = new Set<string>()
  let command: 'build' | 'serve'
  let watchBuild = false
  let server: ViteDevServer | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const signals = {
    SIGINT: () => shutdown('SIGINT'),
    SIGTERM: () => shutdown('SIGTERM'),
    SIGHUP: () => shutdown('SIGHUP')
  }
  const shutdown = (signal: keyof typeof signals) => {
    dispose()
    // Let the host handle signals when it has registered its own listeners.
    if (process.listenerCount(signal) === 0) process.kill(process.pid, signal)
  }

  const releaseFile = (directory: GeneratedDirectory, name: string) => {
    const file = directory.files.get(name)
    if (!file) return

    file.owners.delete(owner)
    if (file.owners.size) return

    const filePath = path.join(langPath, name)
    if (file.original !== undefined) {
      writeFileSync(filePath, file.original)
    } else if (existsSync(filePath)) {
      unlinkSync(filePath)
    }
    directory.files.delete(name)
  }

  const clean = () => {
    const directory = directories.get(langPath)
    if (!directory) return

    ownedFiles.forEach((name) => releaseFile(directory, name))
    ownedFiles.clear()
    directory.owners.delete(owner)
    if (directory.owners.size) return

    if (directory.created && existsSync(langPath) && readdirSync(langPath).length === 0) {
      rmdirSync(langPath)
    }
    directories.delete(langPath)
  }

  const generate = () => {
    const translations = prepareExtendedParsedLangFiles(langPaths)
    if (!translations.length) {
      clean()
      return
    }

    let directory = directories.get(langPath)
    if (!directory) {
      directory = { owners: new Set(), files: new Map(), created: !existsSync(langPath) }
      directories.set(langPath, directory)
    }
    directory.owners.add(owner)

    const nextFiles = new Set(translations.map(({ name }) => name))
    nextFiles.forEach((name) => {
      let file = directory.files.get(name)
      if (!file) {
        const filePath = path.join(langPath, name)
        file = { owners: new Set(), original: existsSync(filePath) ? readFileSync(filePath) : undefined }
        directory.files.set(name, file)
      }
      file.owners.add(owner)
      // Record ownership before writing so a failed build can still clean up.
      ownedFiles.add(name)
    })

    generateFiles(langPath, translations)
    ownedFiles.forEach((name) => {
      if (!nextFiles.has(name)) releaseFile(directory, name)
    })
    ownedFiles = nextFiles
  }

  const isTranslation = (file: string) =>
    file.endsWith('.php') &&
    langPaths.some((directory) => {
      const relative = path.relative(directory, realPath(path.resolve(file)))
      return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)
    })

  const onChange = (file: string) => {
    if (!isTranslation(file)) return

    clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        generate()
        // Resolvers cache languages, so reload after invalidating client and SSR modules.
        server.moduleGraph.invalidateAll()
        server.ws.send({ type: 'full-reload', path: '*' })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        server.config.logger.error('[laravel-vue-i18n] ' + message)
        server.ws.send({ type: 'error', err: { message, stack: error instanceof Error ? error.stack : '' } })
      }
    }, 30)
  }

  const dispose = () => {
    clearTimeout(timer)
    if (server) {
      server.watcher.off('add', onChange)
      server.watcher.off('change', onChange)
      server.watcher.off('unlink', onChange)
      server = undefined
    }
    process.off('exit', clean)
    for (const signal of Object.keys(signals) as (keyof typeof signals)[]) {
      process.off(signal, signals[signal])
    }
    clean()
  }

  return {
    name: 'i18n',
    enforce: 'post',
    config() {
      // Keep the flag enabled for PHP files added after the dev server starts.
      return {
        define: {
          'process.env.LARAVEL_VUE_I18N_HAS_PHP': true,
          'import.meta.env.VITE_LARAVEL_VUE_I18N_HAS_PHP': true
        }
      }
    },
    configResolved(config) {
      command = config.command
      watchBuild = !!config.build.watch
      langPath = realPath(path.resolve(config.root, settings.langPath ?? 'lang'))
      langPaths = [
        path.resolve(config.root, 'vendor/laravel/framework/src/Illuminate/Translation/lang'),
        langPath,
        ...(settings.additionalLangPaths ?? []).map((directory) => path.resolve(config.root, directory))
      ].map(realPath)
    },
    buildStart() {
      generate()
      if (command === 'build' && watchBuild) {
        const watchDirectory = (directory: string) => {
          this.addWatchFile(directory)
          for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name)
            if (entry.isDirectory()) watchDirectory(file)
            else if (entry.name.endsWith('.php')) this.addWatchFile(file)
          }
        }
        langPaths.filter(existsSync).forEach(watchDirectory)
      }
    },
    buildEnd(error) {
      if (command === 'build' && error) dispose()
    },
    closeBundle() {
      if (!watchBuild || command === 'serve') dispose()
    },
    closeWatcher: dispose,
    configureServer(viteServer) {
      server = viteServer
      server.watcher.add(langPaths)
      server.watcher.on('add', onChange)
      server.watcher.on('change', onChange)
      server.watcher.on('unlink', onChange)
      process.once('exit', clean)
      for (const signal of Object.keys(signals) as (keyof typeof signals)[]) {
        process.prependOnceListener(signal, signals[signal])
      }
    }
  }
}
