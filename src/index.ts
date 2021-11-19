import { reactive, Plugin } from 'vue'
import { OptionsInterface } from './interfaces/options'
import { LanguageInterface } from './interfaces/language'
import { ReplacementsInterface } from './interfaces/replacements'
import { choose } from './pluralization'

/**
 * The default options, for the plugin.
 */
const DEFAULT_OPTIONS: OptionsInterface = {
  lang: document.documentElement.lang || 'en',
  resolve: (lang: string) => new Promise((resolve) => resolve({ default: {} }))
}

/**
 * Stores the current options.
 */
let options: OptionsInterface = DEFAULT_OPTIONS;

/**
 * Stores the loaded languages.
 */
let loaded: LanguageInterface[] = []

/**
 * The active messages to use.
 */
const activeMessages: object = reactive({})

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
export function trans(key: string, replacements: ReplacementsInterface = {}): string {
  if (!activeMessages[key]) {
    activeMessages[key] = key
  }

  return makeReplacements(activeMessages[key], replacements)
}

/**
 * Translates the given message based on a count.
 */
export function trans_choice(key: string, number: number, replacements: ReplacementsInterface = {}): string {
  const message = trans(key, replacements)

  replacements.count = number.toString()

  return makeReplacements(choose(message, number, options.lang), replacements)
}

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
 * Make the place-holder replacements on a line.
 */
function makeReplacements(message: string, replacements?: ReplacementsInterface): string {
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  Object.entries(replacements || []).forEach(([key, value]) => {
    message = message
      .replace(`:${key}`, value)
      .replace(`:${key.toUpperCase()}`, value.toUpperCase())
      .replace(`:${capitalize(key)}`, capitalize(value))
  })

  return message
}

/**
 * Resets all the data stored in memory.
 */
export const reset = (): void => {
  loaded = [];
  options = DEFAULT_OPTIONS;

  for (const [key] of Object.entries(activeMessages)) {
    activeMessages[key] = null;
  }
}

/**
 * The Vue Plugin. to be used on your Vue app like this: `app.use(i18nVue)`
 */
export const i18nVue: Plugin = {
  install: (app, currentOptions: OptionsInterface = {}) => {
    options = { ...options, ...currentOptions }
    app.config.globalProperties.$t = (key: string, replacements: ReplacementsInterface) => trans(key, replacements)
    loadLanguageAsync(options.lang)
  }
}
