import path from 'path'
import fs from 'fs'

import mix from 'laravel-mix'
import { Component } from 'laravel-mix/src/components/Component'
import { EnvironmentPlugin, Configuration } from 'webpack'

import { parseAll, hasPhpTranslations } from './loader'

class BeforeBuildPlugin {
  callback: Function

  constructor(callback: Function) {
    this.callback = callback
  }

  apply(compiler): void {
    compiler.hooks.compile.tap('BeforeBuildPlugin', this.callback)
  }
}

mix.extend(
  'i18n',
  class extends Component {
    langPath: string
    context: any

    register(langPath: string = 'lang'): void {
      this.langPath = this.context.paths.rootPath + path.sep + langPath
    }

    webpackConfig(config: Configuration): void {
      let files = []

      config.watchOptions = {
        ignored: /php.*\.json/
      }

      if (hasPhpTranslations(this.langPath)) {
        config.plugins.push(
          new EnvironmentPlugin({
            LARAVEL_VUE_I18N_HAS_PHP: true
          })
        )
      }

      config.plugins.push(
        new BeforeBuildPlugin(() => {
          files = parseAll(this.langPath)
        })
      )

      this.context.listen('build', () => {
        files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path)
          }
        })
      })
    }
  }
)
