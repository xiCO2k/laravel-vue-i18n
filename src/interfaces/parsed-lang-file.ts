/**
 * The Interface that is responsible for a parsed lang file.
 */
export interface ParsedLangFileInterface {
  name: string
  translations: { [key: string]: string }
}
