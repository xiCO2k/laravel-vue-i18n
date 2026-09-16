import { createApp } from 'vue'
import { defineConfig } from 'vite'
import { i18nVue, I18n } from 'laravel-vue-i18n'
import i18n from 'laravel-vue-i18n/vite'
import type { OptionsInterface } from 'laravel-vue-i18n/interfaces/options'

const sync: OptionsInterface = { resolve: (lang) => ({ hello: lang }) }
new I18n(sync)
createApp({}).use(i18nVue, sync)
createApp({}).use(i18nVue, { resolve: async (lang) => ({ default: { hello: lang } }) })
defineConfig({ plugins: [i18n(), i18n('lang'), i18n({ additionalLangPaths: ['locales'] })] })
// @ts-expect-error Invalid options should be rejected.
createApp({}).use(i18nVue, { lang: 123 })
// @ts-expect-error Resolvers must return translation data.
new I18n({ resolve: () => 123 })
// @ts-expect-error Vite options must contain directory paths.
i18n({ additionalLangPaths: [123] })
