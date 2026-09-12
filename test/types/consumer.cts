import runtime = require('laravel-vue-i18n')
import plugin = require('laravel-vue-i18n/vite')

new runtime.I18n({ resolve: (lang) => ({ hello: lang }) })
plugin.default()
