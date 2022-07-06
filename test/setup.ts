import { mount } from '@vue/test-utils'
import { i18nVue } from '../src'
import { parseAll } from '../src/loader'

global.mountPlugin = async (template = '<div />', lang = 'pt', fallbackLang = 'pt') => {
  const wrapper = mount({ template }, {
    global: {
      plugins: [[i18nVue, {
        lang,
        fallbackLang,
        resolve: lang => import(`./fixtures/lang/${lang}.json`),
      }]]
    }
  });

  await new Promise(resolve => setTimeout(resolve))

  return wrapper;
}

global.mountPluginWithRequire = async (template = '<div />', lang = 'pt', fallbackLang = 'pt') => {
  const wrapper = mount({ template }, {
    global: {
      plugins: [[i18nVue, {
        lang,
        fallbackLang,
        resolve: (lang) => require(`./fixtures/lang/${lang}.json`),
      }]]
    }
  });

  await new Promise(resolve => setTimeout(resolve))

  return wrapper;
}

global.mixLoader = () => {
  parseAll(__dirname + '/fixtures/lang/');

  process.env = Object.assign(process.env, {
    LARAVEL_VUE_I18N_HAS_PHP: 'true',
  });
}
