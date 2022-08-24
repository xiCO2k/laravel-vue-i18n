import { reactive, Plugin, computed, ComputedRef } from 'vue'
import { OptionsInterface } from './interfaces/options'
import { PluginOptionsInterface } from './interfaces/plugin-options'
import { LanguageInterface } from './interfaces/language'
import { LanguageJsonFileInterface } from './interfaces/language-json-file'
import { ReplacementsInterface } from './interfaces/replacements'
import { choose } from './pluralization'
import { avoidExceptionOnPromise, avoidException } from './utils/avoid-exceptions'
import { hasPhpTranslations } from './utils/has-php-translations'

const isServer = typeof window === 'undefined'

/**
 * Stores the shared i18n class instance
 */
let sharedInstance: I18n = null

/**
 * The default options, for the I18n class
 */
const DEFAULT_OPTIONS: OptionsInterface = {
  lang: !isServer && document.documentElement.lang ? document.documentElement.lang.replace('-', '_') : null,
  fallbackLang: 'en',
  resolve: (lang: string) => new Promise((resolve) => resolve({ default: {} }))
}

/**
 * The default options, for the plugin.
 */
const DEFAULT_PLUGIN_OPTIONS: PluginOptionsInterface = {
  shared: true
}

/**
 * Checks if the language is loaded.
 */
export function isLoaded(lang?: string): boolean {
  return I18n.getSharedInstance().isLoaded(lang)
}

/**
 * Loads the language file.
 */
export function loadLanguageAsync(lang: string, dashLangTry = false): Promise<string | void> {
  return I18n.getSharedInstance().loadLanguageAsync(lang, dashLangTry)
}

/**
 * Get the translation for the given key.
 */
export function trans(key: string, replacements: ReplacementsInterface = {}): string {
  return I18n.getSharedInstance().trans(key, replacements)
}

/**
 * Get the translation for the given key and watch for any changes.
 */
export function wTrans(key: string, replacements: ReplacementsInterface = {}): ComputedRef<string> {
  return I18n.getSharedInstance().wTrans(key, replacements)
}

/**
 * Translates the given message based on a count.
 */
export function transChoice(key: string, number: number, replacements: ReplacementsInterface = {}): string {
  return I18n.getSharedInstance().transChoice(key, number, replacements)
}

/**
 * Translates the given message based on a count and watch for changes.
 */
export function wTransChoice(
  key: string,
  number: number,
  replacements: ReplacementsInterface = {}
): ComputedRef<string> {
  return I18n.getSharedInstance().wTransChoice(key, number, replacements)
}

/**
 * Returns the current active language.
 */
export function getActiveLanguage(): string {
  return I18n.getSharedInstance().getActiveLanguage()
}

/**
 * Resets all the data stored in memory.
 */
export const reset = (): void => {
  sharedInstance?.reset() // avoid creating a shared instance here
}

/**
 * Alias to `transChoice` to mimic the same function name from Laravel Framework.
 */
export const trans_choice = transChoice

/**
 * The Vue Plugin. to be used on your Vue app like this: `app.use(i18nVue)`
 */
export const i18nVue: Plugin = {
  install(app, options: PluginOptionsInterface = {}) {
    options = { ...DEFAULT_PLUGIN_OPTIONS, ...options }

    const i18n = options.shared ? I18n.getSharedInstance(options) : new I18n(options)

    app.config.globalProperties.$t = (key: string, replacements: ReplacementsInterface) => i18n.trans(key, replacements)
    app.config.globalProperties.$tChoice = (key: string, number: number, replacements: ReplacementsInterface) =>
      i18n.transChoice(key, number, replacements)

    app.provide('i18n', i18n)
  }
}

/**
 * The I18n class. Encapsulates all language loading and translation logic.
 */
export class I18n {
  /**
   * Stores the loaded languages.
   */
  private static loaded: LanguageInterface[] = []

  // Stores options for the current instance
  private options: OptionsInterface

  // Stores messages for the currently active language
  private activeMessages: object = reactive({})

  /**
   * Creates a new instance of the I18n class, applying default options
   */
  constructor(options: OptionsInterface = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    this[isServer ? 'loadLanguage' : 'loadLanguageAsync'](this.getActiveLanguage())
  }

  /**
   * Sets options on the instance, preserving any values not present in new options
   */
  setOptions(options: OptionsInterface = {}): I18n {
    this.options = { ...this.options, ...options }

    return this
  }

  /**
   * Loads the language async.
   */
  loadLanguage(lang: string, dashLangTry: boolean = false): void {
    const loadedLang: LanguageInterface = I18n.loaded.find((row) => row.lang === lang)

    if (loadedLang) {
      this.setLanguage(loadedLang)

      return
    }

    const { default: messages } = this.resolveLang(this.options.resolve, lang)

    this.applyLanguage(lang, messages, dashLangTry, this.loadLanguage)
  }

  /**
   * Loads the language file.
   */
  async loadLanguageAsync(lang: string, dashLangTry = false): Promise<string | void> {
    const loadedLang: LanguageInterface = I18n.loaded.find((row) => row.lang === lang)

    if (loadedLang) {
      return Promise.resolve(this.setLanguage(loadedLang))
    }

    const { default: messages } = await this.resolveLangAsync(this.options.resolve, lang)
    return this.applyLanguage(lang, messages, dashLangTry, this.loadLanguageAsync)
  }

  /**
   * Resolves the language file or data, from direct data, synchronously.
   */
  resolveLang(callable: Function, lang: string, data: { [key: string]: string } = {}): LanguageJsonFileInterface {
    if (!Object.keys(data).length) {
      data = avoidException(callable, lang)
    }

    if (hasPhpTranslations(isServer)) {
      return {
        default: {
          ...data,
          ...avoidException(callable, `php_${lang}`)
        }
      }
    }

    return { default: data }
  }

  /**
   * It resolves the language file or data, from direct data, require or Promise.
   */
  async resolveLangAsync(callable: Function, lang: string): Promise<LanguageJsonFileInterface> {
    let data = avoidException(callable, lang)

    if (!(data instanceof Promise)) {
      return this.resolveLang(callable, lang, data)
    }

    if (hasPhpTranslations(isServer)) {
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

  /**
   * Applies the language data and saves it to the loaded storage.
   */
  applyLanguage(
    lang: string,
    messages: { [key: string]: string },
    dashLangTry: boolean = false,
    callable: Function
  ): string {
    if (Object.keys(messages).length < 1) {
      if (/[-_]/g.test(lang) && !dashLangTry) {
        return callable.call(
          this,
          lang.replace(/[-_]/g, (char) => (char === '-' ? '_' : '-')),
          true
        )
      }

      if (lang !== this.options.fallbackLang) {
        return callable.call(this, this.options.fallbackLang)
      }
    }

    const data: LanguageInterface = { lang, messages }
    I18n.loaded.push(data)

    return this.setLanguage(data)
  }

  /**
   * Sets the language messages to the activeMessages.
   */
  setLanguage({ lang, messages }: LanguageInterface): string {
    if (!isServer) {
      // When setting the HTML lang attribute, hyphen must be use instead of underscore.
      document.documentElement.setAttribute('lang', lang.replace('_', '-'))
    }

    this.options.lang = lang

    for (const [key, value] of Object.entries(messages)) {
      this.activeMessages[key] = value
    }

    for (const [key] of Object.entries(this.activeMessages)) {
      if (!messages[key]) {
        this.activeMessages[key] = null
      }
    }

    return lang
  }

  /**
   * Returns the current active language.
   */
  getActiveLanguage(): string {
    return this.options.lang || this.options.fallbackLang
  }

  /**
   * Checks if the language is loaded.
   */
  isLoaded(lang?: string): boolean {
    lang ??= this.getActiveLanguage()

    return I18n.loaded.some((row) => row.lang.replace(/[-_]/g, '-') === lang.replace(/[-_]/g, '-'))
  }

  /**
   * Get the translation for the given key.
   */
  trans(key: string, replacements: ReplacementsInterface = {}): string {
    return this.wTrans(key, replacements).value
  }

  /**
   * Get the translation for the given key and watch for any changes.
   */
  wTrans(key: string, replacements: ReplacementsInterface = {}): ComputedRef<string> {
    if (!this.activeMessages[key]) {
      this.activeMessages[key] = key
    }

    return computed(() => this.makeReplacements(this.activeMessages[key], replacements))
  }

  /**
   * Translates the given message based on a count.
   */
  transChoice(key: string, number: number, replacements: ReplacementsInterface = {}): string {
    return this.wTransChoice(key, number, replacements).value
  }

  /**
   * Translates the given message based on a count and watch for changes.
   */
  wTransChoice(key: string, number: number, replacements: ReplacementsInterface = {}): ComputedRef<string> {
    const message = this.wTrans(key, replacements)

    replacements.count = number.toString()

    return computed(() => this.makeReplacements(choose(message.value, number, this.options.lang), replacements))
  }

  /**
   * Make the place-holder replacements on a line.
   */
  makeReplacements(message: string, replacements?: ReplacementsInterface): string {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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
  reset = (): void => {
    I18n.loaded = []
    this.options = DEFAULT_OPTIONS

    for (const [key] of Object.entries(this.activeMessages)) {
      this.activeMessages[key] = null
    }

    if (this === sharedInstance) {
      sharedInstance = null
    }
  }

  /**
   * Gets the shared I18n instance, instantiating it if not yet created
   */
  static getSharedInstance(options?: OptionsInterface): I18n {
    return sharedInstance?.setOptions(options) || (sharedInstance = new I18n(options))
  }
}
