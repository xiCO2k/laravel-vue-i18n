# Laravel Vue i18n

**laravel-vue-i18n** allows to connect your `Laravel` Framework translation files with `Vue`.

## Usage

```js
import { createApp } from 'vue'
import { i18nVue } from 'laravel-vue-i18n'

createApp()
    .use(i18nVue, {
        resolve: lang => import(`../lang/${lang}.json`)
    })
    .mount(document.getElementById('app'));
```

```html
<template>
    <div>{{ $t('Hi all') }}</div>
</template>
```

### Plugin Options

```js
createApp().use(i18nVue, {
    lang: 'pt',
    resolve: lang => import(`../lang/${lang}.json`),
})
```

### trans()

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
