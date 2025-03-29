import { OptionsInterface } from './options'

/**
 * The Interface that is responsible for the Options provided.
 */
export interface PluginOptionsInterface extends OptionsInterface {
  shared?: boolean
}

export interface VitePluginOptionsInterface {
  langPath?: string
  additionalLangPaths?: string[],
  treeShake?: boolean,
}
