import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
import { flushPromises, mount } from '@vue/test-utils'
import { i18nVue } from '../src'
import { generateFiles, parseAll } from '../src/loader'

global.mountPlugin = async (
  template = '<div />',
  lang = 'pt',
  fallbackLang = 'pt',
  fallbackMissingTranslations = false
) => {
  const pending = new Set<Promise<unknown>>()
  const wrapper = mount(
    { template },
    {
      global: {
        plugins: [
          [
            i18nVue,
            {
              lang,
              fallbackLang,
              fallbackMissingTranslations,
              resolve: (lang) => {
                const promise = readFile(`${__dirname}/fixtures/lang/${lang}.json`, 'utf8')
                  .then((content) => ({ default: JSON.parse(content) }))
                  .finally(() => pending.delete(promise))
                pending.add(promise)
                return promise
              }
            }
          ]
        ]
      }
    }
  )

  do {
    await Promise.allSettled([...pending])
    await flushPromises()
  } while (pending.size)

  return wrapper
}

global.mountPluginWithRequire = async (template = '<div />', lang = 'pt', fallbackLang = 'pt') => {
  const wrapper = mount(
    { template },
    {
      global: {
        plugins: [
          [
            i18nVue,
            {
              lang,
              fallbackLang,
              resolve: (lang) => require(`./fixtures/lang/${lang}.json`)
            }
          ]
        ]
      }
    }
  )

  await flushPromises()

  return wrapper
}

global.mixLoader = () => {
  const langPath = __dirname + '/fixtures/lang/'
  generateFiles(langPath, parseAll(langPath))

  process.env = Object.assign(process.env, {
    LARAVEL_VUE_I18N_HAS_PHP: 'true'
  })
}
