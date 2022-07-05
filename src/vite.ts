import { existsSync, unlinkSync } from 'fs'
import { parseAll, hasPhpTranslations } from './loader'

export default function i18n(langPath: string = 'lang') {
  let files: { name: string; path: string }[] = []
  let exitHandlersBound: boolean = false

  const clean = () => {
    files.forEach((file) => unlinkSync(file.path))

    files = []
  }

  return {
    name: 'i18n',
    enforce: 'post',
    config(config) {
      if (!hasPhpTranslations(langPath)) {
        return
      }

      files = parseAll(langPath)

      /** @ts-ignore */
      process.env.VITE_LARAVEL_VUE_I18N_HAS_PHP = true;

      return {
        define: {
          'process.env.LARAVEL_VUE_I18N_HAS_PHP': true
        }
      }
    },
    buildEnd: clean,
    handleHotUpdate(ctx) {
      if (/lang\/.*\.php$/.test(ctx.file)) {
        const updates = [];

        files = parseAll(langPath)

        files.forEach(({ path }) => {
          let type;

          if (path.endsWith('js') || path.endsWith('json')) {
            type = 'js-update';
          }

          updates.push({
            type: type,
            path: path,
            acceptedPath: path,
            timestamp: (new Date).getTime(),
          });
        });

        if (updates.length > 0) {
          ctx.server.ws.send({
            type: 'update',
            updates,
          });
        }
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
