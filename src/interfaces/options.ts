import { LanguageJsonFileInterface } from './language-json-file'

/**
 * The Interface that is responsible for the Options provided.
 */
export interface OptionsInterface {
  lang?: string
  fallbackLang?: string
  fallbackMissingTranslations?: boolean
  /**
   * Setting this to `true` preserves slashes in translatable
   * strings in case a source file with localizations is not
   * available. By default, all slashes are replaced with dots.
   *
   * @default false
   *
   * @example Behavior with the `preserveSlashesInKeys: false`.
   * @code
   * trans('Active / Overdue') === 'Active . Overdue'
   * @code
   *
   * @example Behavior with the `preserveSlashesInKeys: true`.
   * @code
   * trans('Active / Overdue') === 'Active / Overdue'
   * @code
   */
  preserveSlashesInKeys?: boolean
  resolve?(lang: string): Promise<LanguageJsonFileInterface>
  onLoad?: (lang: string) => void
}
