import fs from 'fs'
import path from 'path'
import { parseAll, hasPhpTranslations } from './loader'

export default function i18n(langPath: string = 'lang') {
  let langPathAbsolute: string
  let files: { name: string; path: string }[] = []

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
    transform(src, id) {
      if (/php.*\.json/.test(id)) {
        console.log('hit here');
        return null;
      }
    },
    config(config) {
      langPathAbsolute = langPath

      if (hasPhpTranslations(langPathAbsolute)) {
        /** @ts-ignore */
        process.env.VITE_LARAVEL_VUE_I18N_HAS_PHP = true
      }

      files = parseAll(langPathAbsolute)
    },
    buildEnd: cleanFiles,
    handleHotUpdate: cleanFiles
  }
}
