import fs from 'fs'
import path from 'path'
import { parseAll, hasPhpTranslations } from './loader'

export default function i18n(langPath: string = 'lang') {
  let langPathAbsolute: string
  let files: { name: string; path: string }[] = []
  let exitHandlersBound = false;

  const cleanFiles = () => {
    files.forEach((file) => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
    })

    files = []
  }

  return {
    name: 'i18n',
    enforce: 'post',
    config(config) {
      langPathAbsolute = langPath

      if (hasPhpTranslations(langPathAbsolute)) {
        /** @ts-ignore */
        files = parseAll(langPathAbsolute)

        return {
          define: {
            'process.env.LARAVEL_VUE_I18N_HAS_PHP': 'true'
          }
        }
      }
    },
    buildEnd: cleanFiles,
    handleHotUpdate({ file }) {
      if (/lang\/.*\.php$/.test(file)) {
        files = parseAll(langPathAbsolute)
      }
    },
    configureServer(server) {
      if (exitHandlersBound) {
        return
      }

      process.on('exit', cleanFiles)
      process.on('SIGINT', process.exit)
      process.on('SIGTERM', process.exit)
      process.on('SIGHUP', process.exit)

      exitHandlersBound = true;
    }
  }
}
