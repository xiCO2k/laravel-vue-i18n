/**
 * The Interface that is responsible for a loaded language.
 */
export interface LanguageInterface {
  lang: string
  messages: {
    [key: string]: string
  }
}
