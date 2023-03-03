import path from 'path'
import fs from 'fs'

import mix from 'laravel-mix'
import { Component } from 'laravel-mix/src/components/Component'
import { EnvironmentPlugin, Configuration } from 'webpack'

import { generateFiles, parseAll, hasPhpTranslations } from './loader'

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
    frameworkLangPath: string
    context: any

    register(langPath: string = 'lang'): void {
      this.langPath = this.context.paths.rootPath + path.sep + langPath
      this.frameworkLangPath =
        this.context.paths.rootPath +
        path.sep +
        'vendor/laravel/framework/src/Illuminate/Translation/lang/'.replace('/', path.sep)
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
          files = generateFiles(this.langPath, [...parseAll(this.frameworkLangPath), ...parseAll(this.langPath)])
        })
      )

      this.context.listen('build', () => {
        files.forEach((file) => {
          if (fs.existsSync(this.langPath + file.name)) {
            fs.unlinkSync(this.langPath + file.name)
          }
        })

        if (fs.existsSync(this.langPath) && fs.readdirSync(this.langPath).length < 1) {
          fs.rmdirSync(this.langPath)
        }
      })
    }
  }
)
