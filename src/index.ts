import { reactive, Plugin } from 'vue'
import { OptionsInterface } from './interfaces/options'
import { LanguageInterface } from './interfaces/language'
import { ReplacementsInterface } from './interfaces/replacements'

/**
 * The Default language will be used if there is no lang provided.
 */
const DEFAULT_LANG: string = document.documentElement.lang || 'en'

/**
 * Stores the current options.
 */
let options: OptionsInterface = {
  lang: DEFAULT_LANG,
  resolve: (lang: string) => new Promise(resolve => resolve({ "default": {} }))
}

/**
 * Stores the loaded languages.
 */
const loaded: LanguageInterface[] = []

/**
 * The active messages to use.
 */
const activeMessages: object = reactive({})

/**
 * Sets the language messages to the activeMessages.
 */
function setLanguage({ lang, messages }: LanguageInterface): string {
  document.querySelector('html').setAttribute('lang', lang)

  for (const [key, value] of Object.entries(messages)) {
    activeMessages[key] = value
  }

  for (const [key] of Object.entries(activeMessages)) {
    if (!messages[key]) {
      activeMessages[key] = null
    }
  }

  return lang
}

/**
 * Loads the language file.
 */
export function loadLanguageAsync(lang: string): Promise<string | void> {
  const loadedLang: LanguageInterface = loaded.find((row) => row.lang === lang)

  if (loadedLang) {
    return Promise.resolve(setLanguage(loadedLang))
  }

  return options
    .resolve(lang)
    .then(({ default: messages }) => {
      const data: LanguageInterface = { lang, messages }
      loaded.push(data)
      return setLanguage(data)
    })
    .catch((err) => {
      throw new TypeError(`Cannot load lang: ${lang} file: ${err.message}`)
    })
}

/**
 * Get the translation for the given key.
 */
export function trans(key: string, replacements: ReplacementsInterface): string {
  if (!activeMessages[key]) {
    activeMessages[key] = key
  }

  let message = activeMessages[key]

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  Object.entries(replacements || []).forEach(([key, value]) => {
    message = message
      .replace(`:${key}`, value)
      .replace(`:${key.toUpperCase()}`, value.toUpperCase())
      .replace(`:${capitalize(key)}`, capitalize(value))
  })

  return message
}

export const i18nVue: Plugin = {
  install: (app, currentOptions: OptionsInterface = {}) => {
    options = { ...options, ...currentOptions }
    app.config.globalProperties.$t = (key: string, replacements: ReplacementsInterface) => trans(key, replacements)
    loadLanguageAsync(options.lang)
  }
}
