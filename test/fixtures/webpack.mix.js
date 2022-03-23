const mix = require('laravel-mix');
const { parseAll } = require('../../dist/loader');


mix.extend('foo', ({ context }) => {
    console.log(parseAll(context + '/lang'));
});

// Trigger your new plugin.
mix.foo('some-value');
