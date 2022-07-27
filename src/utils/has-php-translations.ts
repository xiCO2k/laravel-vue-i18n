export function hasPhpTranslations(isServer: boolean): boolean {
  return isServer || checkProcessEnv() || checkImportMeta()
}

function checkProcessEnv(): boolean {
  return typeof process !== 'undefined' && process.env?.LARAVEL_VUE_I18N_HAS_PHP ? true : false
}

function checkImportMeta(): boolean {
  /** @ts-ignore */
  return typeof import.meta.env !== 'undefined' &&
    /** @ts-ignore */
    import.meta.env.VITE_LARAVEL_VUE_I18N_HAS_PHP
    ? true
    : false
}
