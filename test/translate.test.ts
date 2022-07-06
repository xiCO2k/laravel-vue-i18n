import { mount } from '@vue/test-utils'
import { i18nVue, trans, trans_choice, loadLanguageAsync, reset, getActiveLanguage, isLoaded, wTrans } from '../src'
import { reset as resetLoader } from '../src/loader'

beforeEach(() => reset());
afterEach(() => resetLoader(__dirname + '/fixtures/lang/'));

it('translates with $t mixin', async () => {
  const wrapper = await global.mountPlugin(`<h1 v-text="$t('Welcome!')" />`);

  expect(wrapper.html()).toBe('<h1>Bem-vindo!</h1>')
})

it('translates with "trans" helper', async () => {
  await global.mountPlugin();

  expect(trans('Welcome!')).toBe('Bem-vindo!');
})

it('returns the same message if there is no resolve method provided', async () => {
  const wrapper = mount({ template: `<h1>{{ $t('Welcome!') }}</h1>` }, {
    global: {
      plugins: [i18nVue]
    }
  });

  await new Promise(resolve => setTimeout(resolve));

  expect(wrapper.html()).toBe('<h1>Welcome!</h1>');
  expect(trans('Welcome!')).toBe('Welcome!');
})

it('returns the same string given if it is not found on the lang file', async () => {
  const wrapper = await global.mountPlugin(`<h1>{{ $t('This has no translation') }}</h1>`);

  expect(wrapper.html()).toBe('<h1>This has no translation</h1>')
})

it('fallback to the `fallbackLang` if the `lang` was not provided', async () => {
  await global.mountPlugin(`<div />`, null, 'pt');
  expect(trans('Welcome!')).toBe('Bem-vindo!');
})

it('fallback to the `fallbackLang` if the `lang` was not found', async () => {
  await global.mountPlugin(`<div />`, 'ch', 'pt');

  expect(trans('Welcome!')).toBe('Bem-vindo!');
});

it('returns the given key if the key is not available on the lang', async () => {
  await global.mountPlugin(`<div />`, 'en');
  expect(trans('Only Available on EN')).toBe('Only Available on EN');

  await loadLanguageAsync('pt');
  expect(trans('Only Available on EN')).toBe('Only Available on EN');
})

it('translates key with values with $t mixin', async () => {
  const wrapper = await global.mountPlugin(`<h1>{{ $t('Welcome, :name!', { name: 'Francisco' }) }}</h1>`);

  expect(wrapper.html()).toBe('<h1>Bem-vindo, Francisco!</h1>')
})

it('translates key with values with "trans" helper', async () => {
  await global.mountPlugin();

  expect(trans('Welcome, :name!', { name: 'Francisco' }))
    .toBe('Bem-vindo, Francisco!')
})

it('loads a lang', async () => {
  const wrapper = await global.mountPlugin(`<h1>{{ $t('Welcome, :name!', { name: 'Francisco' }) }}</h1>`, 'en');

  await loadLanguageAsync('pt');
  expect(wrapper.html()).toBe('<h1>Bem-vindo, Francisco!</h1>')
})

it('returns the active lang', async () => {
  await global.mountPlugin();

  expect(getActiveLanguage()).toBe('pt');

  await loadLanguageAsync('en');
  expect(getActiveLanguage()).toBe('en');
})

it('translates to a underscore/dash language', async () => {
  await global.mountPlugin();

  await loadLanguageAsync('zh_TW');
  expect(getActiveLanguage()).toBe('zh_TW');

  await loadLanguageAsync('en');

  await loadLanguageAsync('zh-TW');

  expect(getActiveLanguage()).toBe('zh_TW');
})

it('checks if is a lang is loaded', async () => {
  expect(isLoaded()).toBe(false);
  await global.mountPlugin();

  expect(isLoaded('zh-TW')).toBe(false);
  await loadLanguageAsync('zh-TW');
  expect(isLoaded('zh-TW')).toBe(true);
})

it('checks if watching translation works', async () => {
  await global.mountPlugin();

  const translated = wTrans("Welcome!");
  expect(translated.value)
    .toBe('Bem-vindo!')

  await loadLanguageAsync('en')

  expect(translated.value)
    .toBe('Wecome!')
})

it('resolves translated data without Promise', async () => {
  const wrapper = mount({ template: `<h1>{{ $t('Welcome!') }}</h1>` }, {
    global: {
      plugins: [[i18nVue, {
        resolve: () => ({ 'Foo': 'Bar' }),
      }]]
    }
  });

  await new Promise(resolve => setTimeout(resolve));

  expect(trans('Foo')).toBe('Bar');
});

it('resolves translated data with require', async () => {
  const wrapper = await global.mountPluginWithRequire(`<h1>{{ $t('Welcome!') }}</h1>`);

  expect(trans('Welcome!')).toBe('Bem-vindo!');
});

it('resolves translated data from .php files', async () => {
  global.mixLoader();
  const wrapper = await global.mountPlugin(`<h1 v-text="$t('auth.failed')" />`);

  expect(wrapper.html()).toBe('<h1>As credenciais indicadas não coincidem com as registadas no sistema.</h1>')
});

it('resolves translated data with loader if there is no .php files for that lang', async () => {
  global.mixLoader();
  const wrapper = await global.mountPlugin(`<h1 v-text="$t('Welcome!')" />`, 'es');

  expect(wrapper.html()).toBe('<h1>Bienvenido!</h1>')
})

it('resolves translated data with loader if there is no .php files for that lang with require', async () => {
  global.mixLoader();
  const wrapper = await global.mountPluginWithRequire(`<h1 v-text="$t('Welcome!')" />`, 'es');

  expect(wrapper.html()).toBe('<h1>Bienvenido!</h1>')
});

it('resolves translated data with loader if there is only .php files for that lang', async () => {
  global.mixLoader();
  const wrapper = await global.mountPlugin(`<h1 v-text="$t('auth.failed')" />`, 'fr');

  expect(wrapper.html()).toBe('<h1>Ces identifiants ne correspondent pas à nos enregistrements.</h1>')
})

it('resolves translated data with loader if there is only .php files for that lang with require', async () => {
  global.mixLoader();
  const wrapper = await global.mountPluginWithRequire(`<h1 v-text="$t('auth.failed')" />`, 'fr');

  expect(wrapper.html()).toBe('<h1>Ces identifiants ne correspondent pas à nos enregistrements.</h1>')
})
