<h1 align="center" style="border:none !important">
    Laravel Vue i18n
</h1>

<p align="center">
    <a href="https://github.com/xiCO2k/laravel-vue-i18n/actions"><img alt="GitHub Workflow Status (master)" src="https://github.com/xiCO2k/laravel-vue-i18n/actions/workflows/tests.yaml/badge.svg"></a>
    <a href="https://www.npmjs.com/package/laravel-vue-i18n"><img alt="License" src="https://img.shields.io/npm/l/laravel-vue-i18n.svg?sanitize=true"></a>
    <a href="https://www.npmjs.com/package/laravel-vue-i18n"><img alt="Version" src="https://img.shields.io/npm/v/laravel-vue-i18n.svg"></a>
    <a href="https://www.npmjs.com/package/laravel-vue-i18n"><img alt="Total Downloads" src="https://img.shields.io/npm/dt/laravel-vue-i18n.svg"></a>
</p>

<p align="center">
    <b>laravel-vue-i18n</b> is a <b>Vue3</b> plugin that allows to connect your <b>Laravel</b> Framework translation
    files with <b>Vue</b>. It uses the same logic used on <a href="https://laravel.com/docs/8.x/localization">Laravel Localization</a>.
</p>

## Installation

With [npm](https://www.npmjs.com):
```sh
npm i laravel-vue-i18n
```

or with [yarn](https://yarnpkg.com):
```sh
yarn add laravel-vue-i18n
```

## Setup

> If you want to see a screencast on how to setup check out this video: [How to use Laravel Vue i18n plugin](https://www.youtube.com/watch?v=ONRo8-i5Qsk).

### With Vite

```js
import { createApp } from 'vue'
import { i18nVue } from 'laravel-vue-i18n'

createApp()
    .use(i18nVue, {
        resolve: async lang => {
            const langs = import.meta.glob('../../lang/*.json');
            return await langs[`../../lang/${lang}.json`]();
        }
    })
    .mount('#app');
```

#### SSR (Server Side Rendering)

For Server Side Rendering the resolve method should not receive a `Promise` and instead take advantage of the `eager` param like this:

```js
.use(i18nVue, {
    lang: 'pt',
    resolve: lang => {
        const langs = import.meta.glob('../../lang/*.json', { eager: true });
        return langs[`../../lang/${lang}.json`].default;
    },
})
```

#### PHP Translations Available on Vue

In order to load `php` translations, you can use this `Vite` plugin.

```js
// vite.config.js
import i18n from 'laravel-vue-i18n/vite';

export default defineConfig({
    plugins: [
        laravel([
            'resources/css/app.css'
            'resources/js/app.js',
        ]),
        vue(),

        // Laravel >= 9
        i18n(),

        // Laravel < 9, since the lang folder is inside the resources folder
        // you will need to pass as parameter:
        // i18n('resources/lang'),
    ],
});
```

#### Vite plugin options

In addition to that, you can use this `Vite` plugin with additional paths to load from, this is usefull when you are using a package that let's you override your translations, or in case you are getting your application's lang files from different paths. 

Note that if one key found in two paths, priority will be given to the last given path between these two (In this example translation key will be loaded from `public/locales`)

```js
// vite.config.js
import i18n from 'laravel-vue-i18n/vite';

export default defineConfig({
    plugins: [
        laravel([
            'resources/css/app.css'
            'resources/js/app.js',
        ]),
        vue(),

        i18n({
            // you can also change your langPath here
            // langPath: 'locales' 
            additionalLangPaths: [
                'public/locales' // Load translations from this path too! 
            ]
        }),
    ],
});
```

> During the `npm run dev` execution time, the plugin will create some files like this `php_{lang}.json` on your lang folder.
> And to avoid that to be commited to your code base, I suggest to your `.gitignore` this like:

```bash
lang/php_*.json
```

### With Webpack / Laravel Mix

```js
import { createApp } from 'vue'
import { i18nVue } from 'laravel-vue-i18n'

createApp()
    .use(i18nVue, {
        resolve: lang => import(`../../lang/${lang}.json`),
    })
    .mount('#app');
```

#### SSR (Server Side Rendering)

For Server Side Rendering the resolve method should receive a `require` instead of a `Promise`:

```js
.use(i18nVue, {
    lang: 'pt',
    resolve: lang => require(`../../lang/${lang}.json`),
})
````

#### PHP Translations Available on Vue

In order to load `php` translations, you can use this `Mix` plugin.

```js
const mix = require('laravel-mix');
require('laravel-vue-i18n/mix');

// Laravel >= 9
mix.i18n();

// Laravel < 9, since the lang folder is inside the resources folder
// you will need to pass as parameter:

// mix.i18n('resources/lang');
```

### Usage

```html
<template>
    <div>
        <h1>{{ $t('Welcome, :name!', { name: 'Francisco' }) }}. </h1>
        <div>Logged in {{ $tChoice('{1} :count minute ago|[2,*] :count minutes ago', 10) }}</div>
    </div>
</template>
```

### Plugin Options

- `lang` *(optional)*: If not provided it will try to find from the `<html lang="pt">` tag.
- `fallbackLang` *(optional)*: If the `lang` was not provided or is invalid, it will try reach for this `fallbackLang` instead, default is: `en`.
- `resolve` *(required)*: The way to reach your language files.
- `shared` *(optional)*: Whether to [share the same `I18n` instance](#using-multiple-instances) between different Vue apps, default is: `true`.
- `onLoad` *(optional)*: It's called everytime a language is loaded.

```js
createApp().use(i18nVue, {
    lang: 'pt',
    resolve: lang => import(`../../lang/${lang}.json`),
})
```

### `trans(message: string, replacements: {})`

The `trans()` method can translate a given message.

```js
// lang/pt.json
{
    "Welcome!": "Bem-vindo!",
    "Welcome, :name!": "Bem-vindo, :name!"
}

import { trans } from 'laravel-vue-i18n';

trans('Welcome!'); // Bem-vindo!
trans('Welcome, :name!', { name: 'Francisco' }) // Bem-vindo Francisco!
trans('Welcome, :NAME!', { name: 'Francisco' }) // Bem-vindo FRANCISCO!
```

### `wTrans(message: string, replacements: {})`

The `wTrans()` same as `trans()` but returns a reactive obj with translated value,
use it instead of `trans()` to watch any changes (language changes or lang files loaded) and set the new value.
```jsx
// lang/pt.json
{
    "Welcome!": "Bem-vindo!",
    "Welcome, :name!": "Bem-vindo, :name!"
}

import { wTrans } from 'laravel-vue-i18n';

setup() {
    return {
        welcomeLabel: wTrans('Welcome!'),
        welcomeFrancisco: wTrans('Welcome, :name!', { name: 'Francisco' })
    }
}

<template>
    <div>{{ welcomeLabel }}</div> // <div>Bem-vindo!</div>
    <div>{{ welcomeFrancisco }}</div> // <div>Bem-vindo, Francisco!</div>
</template>
```

### `transChoice(message: string, count: number, replacements: {})`

The `transChoice()` method can translate a given message based on a count,
there is also available an `trans_choice` alias, and a mixin called `$tChoice()`.

```js
// lang/pt.json
{
    "There is one apple|There are many apples": "Existe uma maça|Existe muitas maças",
    "{0} There are none|[1,19] There are some|[20,*] There are many": "Não tem|Tem algumas|Tem muitas",
    "{1} :count minute ago|[2,*] :count minutes ago": "{1} há :count minuto|[2,*] há :count minutos"
}

import { transChoice } from 'laravel-vue-i18n';

transChoice('There is one apple|There are many apples', 1); // Existe uma maça
transChoice('{0} There are none|[1,19] There are some|[20,*] There are many', 19); // Tem algumas
transChoice('{1} :count minute ago|[2,*] :count minutes ago', 10); // Há 10 minutos.
```


### `wTransChoice(message: string, count: number, replacements: {})`

The `wTransChoice()` same as `transChoice()` but returns a reactive obj with translated value,
use it instead of `transChoice()` to watch any changes (language changes or lang files loaded) and set the new value.


```jsx
// lang/pt.json
{
    "There is one apple|There are many apples": "Existe uma maça|Existe muitas maças",
    "{0} There are none|[1,19] There are some|[20,*] There are many": "Não tem|Tem algumas|Tem muitas",
    "{1} :count minute ago|[2,*] :count minutes ago": "{1} há :count minuto|[2,*] há :count minutos"
}

import { wTransChoice } from 'laravel-vue-i18n';

setup() {
    return {
        oneAppleLabel: wTransChoice('There is one apple|There are many apples', 1),
        multipleApplesLabel: wTransChoice('{0} There are none|[1,19] There are some|[20,*] There are many', 19)
    }
}

<template>
    <div>{{ oneAppleLabel }}</div> // <div>Existe uma maça</div>
    <div>{{ multipleApplesLabel }}</div> // <div>Tem algumas</div>
</template>
```

### `loadLanguageAsync(lang: string)`

The `loadLanguageAsync()` can be used to change the location during the runtime.

```jsx
import { loadLanguageAsync } from 'laravel-vue-i18n';

<template>
    <div>{{ $t('Welcome!') }}</div>
    <button @click="loadLanguageAsync('pt')">Change to Portuguese Language</button>
</template>
```

### `getActiveLanguage()`

The `getActiveLanguage()` returns the language that is currently being used.


```jsx
import { getActiveLanguage } from 'laravel-vue-i18n';

const lang = getActiveLanguage(); // en
```

### `isLoaded(lang?: string)`

The `isLoaded()` method checks if the language is loaded.
If the `lang` parameter is not passed it will check for the actual language set.

```jsx
import { isLoaded } from 'laravel-vue-i18n';

const loaded = isLoaded(); // true
const loaded = isLoaded('fr'); // false
```

## Using multiple instances

Under the hood, the Vue plugin is using a `I18n` class which encapsulates all the translation logic and the currently active language. This means that it's possible to create multiple class instances, each with different options and active language. This can be useful for scenarios where part of the app needs to be translated to a language different from the main UI.

Note that loaded languages are still shared between different instances. This avoids loading the same set of translations multiple times. The main difference between different instances will be the currently active language.

```js
import { I18n } from 'laravel-vue-i18n'

const resolver = lang => import(`./fixtures/lang/${lang}.json`)

const i18nEn = new I18n({
    lang: 'en',
    resolve: resolver
})
const i18nPt = new I18n({
    lang: 'pt',
    resolve: resolver
})

i18nEn.trans('Welcome!') // will output "Welcome!"
i18nPt.trans('Welcome!') // will output "Bem-vindo!"
```

By default, installing the the `i18nVue` plugin will create a shared instance. This instance is accessed when importing the translation functions, such as `trans`, directly. When using multiple Vue app instances, it's possible to either share the `I18n` instance between them, or have each app create its own instance.

**Shared usage (default)** - all Vue app instances will use the same `I18n` class and currently active language:
```js
import { i18nVue } from 'laravel-vue-i18n'

const appA = createApp()
    .use(i18nVue, { lang: 'pt' })
    .mount('#app-1');

const appB = createApp()
    .use(i18nVue)
    .mount('#app-2');

// elsewhere
import { trans } from 'laravel-vue-i18n'

trans('Welcome!') // will output "Bem-vindo!"
```

**Non-shared usage** - each Vue app will have its own `I18n` instance & currently active language.
```js
import { i18nVue } from 'laravel-vue-i18n'

const appA = createApp()
    .use(i18nVue, {
        lang: 'es'
        shared: false, // don't use the shared instance
    })
    .mount('#app-1');

const appB = createApp()
    .use(i18nVue, {
        lang: 'pt'
        shared: false, // don't use the shared instance
    })
    .mount('#app-2');
```

### Accessing the shared instance
It's possible to access the shared instance via code as well:

```js
import { I18n } from 'laravel-vue-i18n'

I18n.getSharedInstance()
```
### Caveats

It is possible to import a translation function before installing the `i18nVue` plugin. When calling the translation function, ie `trans()`, and the plugin has not been installed, a shared `I18n` instance will be created with default options. This ensures that it's possible to import and call these functions without any fatal errors. However, this may yield undesired results. Therefore, it is advisable to never call any translation methods before the plugin is installed.
