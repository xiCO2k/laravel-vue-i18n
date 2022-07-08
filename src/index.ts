import { reactive, Plugin, computed, ComputedRef } from 'vue'
import { OptionsInterface } from './interfaces/options'
import { LanguageInterface } from './interfaces/language'
import { LanguageJsonFileInterface } from './interfaces/language-json-file'
import { ReplacementsInterface } from './interfaces/replacements'
import { choose } from './pluralization'
import { avoidExceptionOnPromise, avoidException } from './utils/avoid-exceptions'

const isServer = typeof window === 'undefined'

/**
 * The default options, for the plugin.
 */
const DEFAULT_OPTIONS: OptionsInterface = {
  lang: !isServer && document.documentElement.lang ? document.documentElement.lang.replace('-', '_') : null,
  fallbackLang: 'en',
  resolve: (lang: string) => new Promise((resolve) => resolve({ default: {} }))
}

/**
 * Stores the current options.
 */
let options: OptionsInterface = DEFAULT_OPTIONS

/**
 * Stores the loaded languages.
 */
let loaded: LanguageInterface[] = []

/**
 * The active messages to use.
 */
const activeMessages: object = reactive({})

/**
 * Checks if the language is loaded.
 */
export function isLoaded(lang?: string): boolean {
  lang ??= getActiveLanguage()

  return loaded.some((row) => row.lang.replace(/[-_]/g, '-') === lang.replace(/[-_]/g, '-'))
}

/**
 * Loads the language file.
 */
export function loadLanguageAsync(lang: string, dashLangTry = false): Promise<string | void> {
  const loadedLang: LanguageInterface = loaded.find((row) => row.lang === lang)

  if (loadedLang) {
    return Promise.resolve(setLanguage(loadedLang))
  }

  return resolveLang(options.resolve, lang).then(({ default: messages }) => {
    if (Object.keys(messages).length < 1) {
      if (/[-_]/g.test(lang) && !dashLangTry) {
        return loadLanguageAsync(
          lang.replace(/[-_]/g, (char) => (char === '-' ? '_' : '-')),
          true
        )
      }
      if (lang !== options.fallbackLang) {
        return loadLanguageAsync(options.fallbackLang)
      }
    }

    const data: LanguageInterface = { lang, messages }
    loaded.push(data)
    return setLanguage(data)
  })
}

/**
 * Get the translation for the given key.
 */
export function trans(key: string, replacements: ReplacementsInterface = {}): string {
  return wTrans(key, replacements).value
}

/**
 * Get the translation for the given key and watch for any changes.
 */
export function wTrans(key: string, replacements: ReplacementsInterface = {}): ComputedRef<string> {
  if (!activeMessages[key]) {
    activeMessages[key] = key
  }

  return computed(() => makeReplacements(activeMessages[key], replacements))
}

/**
 * Translates the given message based on a count.
 */
export function transChoice(key: string, number: number, replacements: ReplacementsInterface = {}): string {
  return wTransChoice(key, number, replacements).value
}

/**
 * Translates the given message based on a count and watch for changes.
 */
export function wTransChoice(
  key: string,
  number: number,
  replacements: ReplacementsInterface = {}
): ComputedRef<string> {
  const message = wTrans(key, replacements)

  replacements.count = number.toString()

  return computed(() => makeReplacements(choose(message.value, number, options.lang), replacements))
}

/**
 * Returns the current active language.
 */
export function getActiveLanguage(): string {
  return options.lang || options.fallbackLang
}

/**
 * Sets the language messages to the activeMessages.
 */
function setLanguage({ lang, messages }: LanguageInterface): string {
  if (!isServer) {
    // When setting the HTML lang attribute, hyphen must be use instead of underscore.
    document.documentElement.setAttribute('lang', lang.replace('_', '-'))
  }

  options.lang = lang

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
 * It resolves the language file or data, from direct data, require or Promise.
 */
async function resolveLang(callable: Function, lang: string): Promise<LanguageJsonFileInterface> {
  const hasPhpTranslations =
    typeof process !== 'undefined' && process.env?.LARAVEL_VUE_I18N_HAS_PHP
      ? true
      : /** @ts-ignore */
      typeof import.meta.env !== 'undefined' && import.meta.env.VITE_LARAVEL_VUE_I18N_HAS_PHP
      ? true
      : false

  let data = avoidException(callable, lang)

  if (data instanceof Promise) {
    if (hasPhpTranslations) {
      const phpLang = await avoidExceptionOnPromise(callable(`php_${lang}`))
      const jsonLang = await avoidExceptionOnPromise(data)

      return new Promise((resolve) =>
        resolve({
          default: {
            ...phpLang,
            ...jsonLang
          }
        })
      )
    }

    return new Promise(async (resolve) =>
      resolve({
        default: await avoidExceptionOnPromise(data)
      })
    )
  }

  if (hasPhpTranslations) {
    return new Promise((resolve) =>
      resolve({
        default: {
          ...data,
          ...avoidException(callable, `php_${lang}`)
        }
      })
    )
  }

  return new Promise((resolve) => resolve({ default: data }))
}

/**
 * Make the place-holder replacements on a line.
 */
function makeReplacements(message: string, replacements?: ReplacementsInterface): string {
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  Object.entries(replacements || []).forEach(([key, value]) => {
    value = value.toString()

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
  loaded = []
  options = DEFAULT_OPTIONS

  for (const [key] of Object.entries(activeMessages)) {
    activeMessages[key] = null
  }
}

/**
 * Alias to `transChoice` to mimic the same function name from Laravel Framework.
 */
export const trans_choice = transChoice

/**
 * The Vue Plugin. to be used on your Vue app like this: `app.use(i18nVue)`
 */
export const i18nVue: Plugin = {
  install: (app, currentOptions: OptionsInterface = {}) => {
    options = { ...options, ...currentOptions }
    app.config.globalProperties.$t = (key: string, replacements: ReplacementsInterface) => trans(key, replacements)
    app.config.globalProperties.$tChoice = (key: string, number: number, replacements: ReplacementsInterface) =>
      transChoice(key, number, replacements)
    loadLanguageAsync(options.lang || options.fallbackLang)
  }
}
