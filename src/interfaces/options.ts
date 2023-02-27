import { LanguageJsonFileInterface } from './language-json-file'

/**
 * The Interface that is responsible for the Options provided.
 */
export interface OptionsInterface {
  lang?: string
  fallbackLang?: string
  fallbackMissingTranslations?: boolean
  resolve?(lang: string): Promise<LanguageJsonFileInterface>
  onLoad?: (lang: string) => void
}
