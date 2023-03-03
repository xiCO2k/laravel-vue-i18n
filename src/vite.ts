import path from 'path'
import { existsSync, writeFileSync, unlinkSync, readdirSync, rmdirSync } from 'fs'
import { parseAll, hasPhpTranslations, generateFiles } from './loader'
import { ParsedLangFileInterface } from './interfaces/parsed-lang-file'

export default function i18n(langPath: string = 'lang') {
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
      if (!hasPhpTranslations(frameworkLangPath) && !hasPhpTranslations(langPath)) {
        return
      }

      files = generateFiles(langPath, [...parseAll(frameworkLangPath), ...parseAll(langPath)])

      /** @ts-ignore */
      process.env.VITE_LARAVEL_VUE_I18N_HAS_PHP = true

      return {
        define: {
          'process.env.LARAVEL_VUE_I18N_HAS_PHP': true
        }
      }
    },
    buildEnd: clean,
    handleHotUpdate(ctx) {
      if (/lang\/.*\.php$/.test(ctx.file)) {
        files = generateFiles(langPath, [...parseAll(frameworkLangPath), ...parseAll(langPath)])
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
