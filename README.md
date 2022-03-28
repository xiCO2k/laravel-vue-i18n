<h1 align="center" style="border:none !important">
    Laravel Vue i18n
</h1>

<p align="center">
    <a href="https://github.com/xiCO2k/laravel-vue-i18n/actions"><img alt="GitHub Workflow Status (master)" src="https://img.shields.io/github/workflow/status/xiCO2k/laravel-vue-i18n/Tests/main"></a>
    <a href="https://www.npmjs.com/package/laravel-vue-i18n"><img alt="License" src="https://img.shields.io/npm/l/laravel-vue-i18n.svg?sanitize=true"></a>
    <a href="https://www.npmjs.com/package/laravel-vue-i18n"><img alt="Version" src="https://img.shields.io/npm/v/laravel-vue-i18n.svg"></a>
    <a href="https://www.npmjs.com/package/laravel-vue-i18n"><img alt="Total Downloads" src="https://img.shields.io/npm/dt/laravel-vue-i18n.svg"></a>
</p>

<p align="center">
    <b>laravel-vue-i18n</b> is a <b>Vue3</b> plugin that allows to connect your <b>Laravel</b> Framework <b>JSON</b> translation
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

```js
import { createApp } from 'vue'
import { i18nVue } from 'laravel-vue-i18n'

createApp()
    .use(i18nVue, {
        resolve: lang => import(`../../lang/${lang}.json`),
    })
    .mount('#app');
```

### With `vite`

The `resolve` method will need to be:

```js
resolve: async lang => {
    const langs = import.meta.glob('../../lang/*.json');
    return await langs[`../../lang/${lang}.json`]();
}
````

### With SSR

The `resolve` method can receive a `require` instead of a `Promise`:

```js
.use(i18nVue, {
    lang: 'pt',
    resolve: lang => require(`../../lang/${lang}.json`),
})
````

### Laravel Mix Plugin

In order to load `php` translations, you can use this `Mix` plugin.

```js
const mix = require('laravel-mix');
require('laravel-vue-i18n/mix');

// Laravel >= 9
mix.i18n();

// Laravel < 9, since the lang folder is inside the resources folder
// you will need to pass as parameter.
mix.i18n('resouces/lang');
```

### Usage

```html
<template>
    <div>
        <h1>{{ $t('Welcome :name!', { name: 'Francisco' }) }}. </h1>
        <div>Logged in {{ $tChoice('{1} :count minute ago|[2,*] :count minutes ago', 10) }}</div>
    </div>
</template>
```

### Plugin Options

- `lang` *(optional)*: if not provided it will try to find from the `<html lang="pt">` tag, if is not available it will default to `en`.
- `resolve` *(required)*: The way to reach your language files.

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
    "Welcome, :name!": "Bem-vindo, :name!",
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
    "Welcome, :name!": "Bem-vindo, :name!",
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
    "{1} :count minute ago|[2,*] :count minutes ago": "{1} há :count minuto|[2,*] há :count minutos",
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
    "{1} :count minute ago|[2,*] :count minutes ago": "{1} há :count minuto|[2,*] há :count minutos",
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

The `getActiveLanguage()` returns the language that is current beign used.


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
