import { mount } from '@vue/test-utils'
import { i18nVue, trans, loadLanguageAsync } from '../src'

it('translates with $t mixin', async () => {
  const wrapper = mount({ template: `<h1>{{ $t('Welcome!') }}</h1>` }, {
    global: {
      plugins: [[i18nVue, {
        lang: 'pt',
        resolve: lang => import(`./fixtures/lang/${lang}.json`),
      }]]
    }
  });

  await new Promise(resolve => setTimeout(resolve))
  expect(wrapper.html()).toBe('<h1>Bem-vindo!</h1>')
})

it('translates with "trans" helper', async () => {
  const wrapper = mount({ template: '<div />' }, {
    global: {
      plugins: [[i18nVue, {
        lang: 'pt',
        resolve: lang => import(`./fixtures/lang/${lang}.json`),
      }]]
    }
  });

  await new Promise(resolve => setTimeout(resolve))
  expect(trans('Welcome!')).toBe('Bem-vindo!');
})

it('returns the same string given if it is not found on the lang file', async () => {
  const wrapper = mount({ template: `<h1>{{ $t('This has no translation') }}</h1>` }, {
    global: {
      plugins: [[i18nVue, {
        lang: 'pt',
        resolve: lang => import(`./fixtures/lang/${lang}.json`),
      }]]
    }
  });

  await new Promise(resolve => setTimeout(resolve))
  expect(wrapper.html()).toBe('<h1>This has no translation</h1>')
})

it('returns the given key if the key is not available on the lang', async () => {
  const wrapper = mount({ template: `<div />` }, {
    global: {
      plugins: [[i18nVue, {
        lang: 'en',
        resolve: lang => import(`./fixtures/lang/${lang}.json`),
      }]]
    }
  });

  await new Promise(resolve => setTimeout(resolve))
  expect(trans('Only Available on EN')).toBe('Only Available on EN');

  await loadLanguageAsync('pt');
  expect(trans('Only Available on EN')).toBe('Only Available on EN');
})

it('translates key with values with $t mixin', async () => {
  const wrapper = mount({ template: `<h1>{{ $t('Welcome, :name!', { name: 'Francisco' }) }}</h1>` }, {
    global: {
      plugins: [[i18nVue, {
        lang: 'pt',
        resolve: lang => import(`./fixtures/lang/${lang}.json`),
      }]]
    }
  });

  await new Promise(resolve => setTimeout(resolve))
  expect(wrapper.html()).toBe('<h1>Bem-vindo, Francisco!</h1>')
})

it('translates key with values with "trans" helper', async () => {
  const wrapper = mount({ template: '<div />' }, {
    global: {
      plugins: [[i18nVue, {
        lang: 'pt',
        resolve: lang => import(`./fixtures/lang/${lang}.json`),
      }]]
    }
  });

  await new Promise(resolve => setTimeout(resolve))
  expect(trans('Welcome, :name!', { name: 'Francisco' }))
    .toBe('Bem-vindo, Francisco!')
})

it('loads a lang', async () => {
  const wrapper = mount({ template: `<h1>{{ $t('Welcome, :name!', { name: 'Francisco' }) }}</h1>` }, {
    global: {
      plugins: [[i18nVue, {
        resolve: lang => import(`./fixtures/lang/${lang}.json`),
      }]]
    }
  });

  await loadLanguageAsync('pt');
  expect(wrapper.html()).toBe('<h1>Bem-vindo, Francisco!</h1>')
})
