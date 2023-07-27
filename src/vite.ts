import path from 'path'
import { existsSync, writeFileSync, unlinkSync, readdirSync, rmdirSync } from 'fs'
import { parseAll, hasPhpTranslations, generateFiles, prepareExtendedParsedLangFiles } from './loader'
import { ParsedLangFileInterface } from './interfaces/parsed-lang-file'
import { VitePluginOptionsInterface } from './interfaces/plugin-options'
import { Plugin } from 'vite'

export default function i18n(langPath: string = 'lang', options: VitePluginOptionsInterface = {}): Plugin {
  langPath = langPath.replace(/[\\/]$/, '') + path.sep

  const frameworkLangPath = 'vendor/laravel/framework/src/Illuminate/Translation/lang/'.replace('/', path.sep)
  let files: ParsedLangFileInterface[] = []
  let exitHandlersBound: boolean = false

  const clean = () => {
    files.forEach((file) => unlinkSync(langPath + file.name))

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

      const additionalLangPaths = prepareExtendedParsedLangFiles([
        frameworkLangPath,
        langPath,
        ...(options.additionalLangPaths ?? []),
      ])

      files = generateFiles(langPath, additionalLangPaths)
    },
    handleHotUpdate(ctx) {
      if (/lang\/.*\.php$/.test(ctx.file)) {
        const additionalLangPaths = prepareExtendedParsedLangFiles([
          frameworkLangPath,
          langPath,
          ...(options.additionalLangPaths ?? []),
        ])

        files = generateFiles(langPath, additionalLangPaths)
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
