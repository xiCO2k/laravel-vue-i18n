import { mount } from '@vue/test-utils'
import { i18nVue } from '../src'

global.mountPlugin = async (template = '<div />', lang = 'pt') => {
  const wrapper = mount({ template }, {
    global: {
      plugins: [[i18nVue, {
        lang,
        resolve: lang => import(`./fixtures/lang/${lang}.json`),
      }]]
    }
  });

  await new Promise(resolve => setTimeout(resolve))

  return wrapper;
}
