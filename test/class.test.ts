import { I18n } from '../src'

it('can update options and get the active language', async () => {
    const i18n = new I18n({ lang: 'en '})

    i18n.setOptions({ lang: 'et' })

    expect(i18n.getActiveLanguage()).toBe('et')
})

it('can set the active language and its messages', async () => {
    const i18n = new I18n()

    i18n.setLanguage({ lang: 'pt', messages: { 'Welcome!': 'Bem-vindo!' }})

    expect(i18n.getActiveLanguage()).toBe('pt')
    expect(i18n.trans('Welcome!')).toBe('Bem-vindo!')
})

it('does not share state between different instances', async () => {
    const enI18n = new I18n()
    const ptI18n = new I18n()

    enI18n.setLanguage({ lang: 'en', messages: { 'Welcome!': 'Welcome!' }})
    ptI18n.setLanguage({ lang: 'pt', messages: { 'Welcome!': 'Bem-vindo!' }})

    expect(enI18n.getActiveLanguage()).toBe('en')
    expect(enI18n.trans('Welcome!')).toBe('Welcome!')

    expect(ptI18n.getActiveLanguage()).toBe('pt')
    expect(ptI18n.trans('Welcome!')).toBe('Bem-vindo!')
})

it('allows creating a shared instance', async () => {
    const shared1 = I18n.getSharedInstance()
    const shared2 = I18n.getSharedInstance()

    expect(shared1).toBeInstanceOf(I18n)
    expect(shared2).toBe(shared1)
})

it('allows creating a shared instance with options', async () => {
    const shared = I18n.getSharedInstance({ lang: 'pt' })

    expect(shared.getActiveLanguage()).toBe('pt')
})

it('allows updating options when getting a shared instance', async () => {
    const shared = I18n.getSharedInstance({ lang: 'en' })

    I18n.getSharedInstance({ lang: 'pt' })

    expect(shared.getActiveLanguage()).toBe('pt')
})

it('allows resetting all data', async () => {
    const i18n = new I18n({
        resolve: lang => import(`./fixtures/lang/${lang}.json`)
    })

    await i18n.loadLanguageAsync('pt')

    expect(i18n.getActiveLanguage()).toBe('pt')
    expect(i18n.trans('Welcome!')).toBe('Bem-vindo!')

    i18n.reset()

    expect(i18n.getActiveLanguage()).toBe('en')
    expect(i18n.trans('Welcome!')).toBe('Welcome!')
})
