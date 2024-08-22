import path from 'path'
import { existsSync, unlinkSync, readdirSync, rmdirSync } from 'fs'
import { hasPhpTranslations, generateFiles, prepareExtendedParsedLangFiles, getPackagesLangPaths } from './loader'
import { ParsedLangFileInterface } from './interfaces/parsed-lang-file'
import { VitePluginOptionsInterface } from './interfaces/plugin-options'
import { Plugin } from 'vite'

export default function i18n(options: string | VitePluginOptionsInterface = 'lang'): Plugin {
  let langPath = typeof options === 'string' ? options : options.langPath ?? 'lang'
  langPath = langPath.replace(/[\\/]$/, '') + path.sep

  const additionalLangPaths = typeof options === 'string' ? [] : options.additionalLangPaths ?? []
  const loadPackagesLangPaths = typeof options === 'string' ? false : options.loadPackagesLangPaths ?? false

  const frameworkLangPath = 'vendor/laravel/framework/src/Illuminate/Translation/lang/'.replace('/', path.sep)
  let files: ParsedLangFileInterface[] = []
  let exitHandlersBound: boolean = false

  const clean = () => {
    files.forEach((file) => {
      const filePath = langPath + file.name
      if (existsSync(filePath)) {
        unlinkSync(filePath)
      }
    })

    files = []

    if (existsSync(langPath) && readdirSync(langPath).length < 1) {
      rmdirSync(langPath)
    }
  }

  return {
    name: 'i18n',
    enforce: 'post',
    config(config) {
      /** @ts-ignore */
      process.env.VITE_LARAVEL_VUE_I18N_HAS_PHP = true

      return {
        define: {
          'process.env.LARAVEL_VUE_I18N_HAS_PHP': true
        }
      }
    },
    buildEnd: clean,
    buildStart() {
      if (!hasPhpTranslations(frameworkLangPath) && !hasPhpTranslations(langPath)) {
        return
      }

      const packagesLangPaths = loadPackagesLangPaths ? getPackagesLangPaths() : null;
      const langPaths = prepareExtendedParsedLangFiles([frameworkLangPath, langPath, ...additionalLangPaths], packagesLangPaths)

      files = generateFiles(langPath, langPaths)
    },
    handleHotUpdate(ctx) {
      if (/lang\/.*\.php$/.test(ctx.file)) {
        const packagesLangPaths = loadPackagesLangPaths ? getPackagesLangPaths() : null;
        const langPaths = prepareExtendedParsedLangFiles([frameworkLangPath, langPath, ...additionalLangPaths], packagesLangPaths)

        files = generateFiles(langPath, langPaths)
      }
    },
    configureServer(server) {
      if (exitHandlersBound) {
        return
      }

      process.on('exit', clean)
      process.on('SIGINT', process.exit)
      process.on('SIGTERM', process.exit)
      process.on('SIGHUP', process.exit)

      exitHandlersBound = true
    }
  }
}
