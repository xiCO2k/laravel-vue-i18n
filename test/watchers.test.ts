import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { I18n, loadLanguageAsync, reset, trans, trans_choice, wTrans } from '../src'

beforeEach(() => reset())

// https://github.com/xiCO2k/laravel-vue-i18n/issues/222
it('keeps no work alive for translations that are no longer used', async () => {
  const wrapper = await global.mountPlugin(
    `<div>{{ $t('Welcome!') }} {{ $t('Welcome, :name!', { name: 'Ana' }) }}</div>`
  )

  for (let i = 0; i < 100; i++) {
    trans('Welcome!')
    trans_choice('{1} :count minute ago|[2,*] :count minutes ago', i)
  }

  wrapper.unmount()

  const findTranslation = vi.spyOn(I18n.getSharedInstance(), 'findTranslation')

  await loadLanguageAsync('en')
  await flushPromises()

  expect(findTranslation).not.toHaveBeenCalled()
})

it('updates rendered translations when the language changes', async () => {
  const wrapper = await global.mountPlugin(`<h1>{{ $t('Welcome, :name!', { name: 'Ana' }) }} {{ $t('foo/bar') }}</h1>`)

  expect(wrapper.html()).toBe('<h1>Bem-vindo, Ana! baz</h1>')

  await loadLanguageAsync('en')
  await nextTick()

  expect(wrapper.html()).toBe('<h1>Welcome, Ana! foo/bar</h1>')

  await loadLanguageAsync('pt')
  await nextTick()

  expect(wrapper.html()).toBe('<h1>Bem-vindo, Ana! baz</h1>')
})

it('updates "wTrans" values when the language changes and changes back', async () => {
  await global.mountPlugin()

  const welcome = wTrans('Welcome, :name!', { name: 'Ana' })
  const slashKey = wTrans('foo/bar')
  const missing = wTrans('Not existing translation')

  expect([welcome.value, slashKey.value, missing.value]).toEqual(['Bem-vindo, Ana!', 'baz', 'Not existing translation'])

  await loadLanguageAsync('en')

  expect([welcome.value, slashKey.value, missing.value]).toEqual([
    'Welcome, Ana!',
    'foo/bar',
    'Not existing translation'
  ])

  await loadLanguageAsync('pt')

  expect([welcome.value, slashKey.value, missing.value]).toEqual(['Bem-vindo, Ana!', 'baz', 'Not existing translation'])
})
