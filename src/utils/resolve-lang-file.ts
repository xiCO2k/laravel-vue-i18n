export function resolveLangFile(path, langs) {
  const lang = langs[path];

  return typeof lang === 'function' ? lang() : lang;
}
