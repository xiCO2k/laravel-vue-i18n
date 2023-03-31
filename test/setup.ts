import { mount } from '@vue/test-utils'
import { i18nVue } from '../src'
import { generateFiles, parseAll } from '../src/loader'
import type { PluginOptionsInterface } from '../src/interfaces/plugin-options'

global.mountPluginUnconfigured = async (template = '<div />', options?: PluginOptionsInterface) => {
  const wrapper = mount({ template }, {
    global: {
      plugins: [[i18nVue, options]]
    }
  });

  await new Promise(resolve => setTimeout(resolve))

  return wrapper;
}

global.mountPlugin = async (
  template = '<div />',
  lang = 'pt',
  fallbackLang = 'pt',
  fallbackMissingTranslations = false,
  preserveSlashesInKeys = false,
) => {
  return global.mountPluginUnconfigured(template, {
    lang,
    fallbackLang,
    fallbackMissingTranslations,
    preserveSlashesInKeys,
    resolve: lang => import(`./fixtures/lang/${lang}.json`),
  });
}

global.mountPluginWithRequire = async (template = '<div />', lang = 'pt', fallbackLang = 'pt') => {
  return global.mountPluginUnconfigured(template, {
    lang,
    fallbackLang,
    resolve: (lang) => require(`./fixtures/lang/${lang}.json`),
  });
}

global.mixLoader = () => {
  const langPath = __dirname + '/fixtures/lang/';
  generateFiles(langPath, parseAll(langPath));

  process.env = Object.assign(process.env, {
    LARAVEL_VUE_I18N_HAS_PHP: 'true',
  });
}
