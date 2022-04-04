import { trans_choice, transChoice, wTransChoice, loadLanguageAsync } from '../src';
import { choose } from '../src/pluralization';

it.each([
  ['first', 'first', 1],
  ['first', 'first', 10],
  ['first', 'first|second', 1],
  ['second', 'first|second', 10],
  ['second', 'first|second', 0],

  ['first', '{0}  first|{1}second', 0],
  ['first', '{1}first|{2}second', 1],
  ['second', '{1}first|{2}second', 2],
  ['first', '{2}first|{1}second', 2],
  ['second', '{9}first|{10}second', 0],
  ['first', '{9}first|{10}second', 1],
  ['', '{0}|{1}second', 0],
  ['', '{0}first|{1}', 1],
  ['first', '{1.3}first|{2.3}second', 1.3],
  ['second', '{1.3}first|{2.3}second', 2.3],
  ['first line', '{1}first line|{2}second', 1],
  ["first \nline", "{1}first \nline|{2}second", 1],

  ['first', '{0}  first|[1,9]second', 0],
  ['second', '{0}first|[1,9]second', 1],
  ['second', '{0}first|[1,9]second', 10],
  ['first', '{0}first|[2,9]second', 1],
  ['second', '[4,*]first|[1,3]second', 1],
  ['first', '[4,*]first|[1,3]second', 100],
  ['second', '[1,5]first|[6,10]second', 7],
  ['first', '[*,4]first|[5,*]second', 1],
  ['second', '[5,*]first|[*,4]second', 1],
  ['second', '[5,*]first|[*,4]second', 0],

  ['first', '{0}first|[1,3]second|[4,*]third', 0],
  ['second', '{0}first|[1,3]second|[4,*]third', 1],
  ['third', '{0}first|[1,3]second|[4,*]third', 9],

  ['first', 'first|second|third', 1],
  ['second', 'first|second|third', 9],
  ['second', 'first|second|third', 0],

  ['first', '{0}  first | { 1 } second', 0],
  ['first', '[4,*]first | [1,3]second', 100],
])('translates plurization with "transChoice" helper', async (expected, message, number) => {
  const wrapper = await global.mountPlugin()

  expect(transChoice(message, number)).toBe(expected)
})

it.each([
  ['Francisco, it just arrived', '{0} :name, it just arrived|{1} :name, it arrived one minute ago|[2,*] :name, it arrived :count minutes ago', { name: 'Francisco' }, 0],
  ['Francisco, it arrived one minute ago', '{0} :name, it just arrived|{1} :name, it arrived one minute ago|[2,*] :name, it arrived :count minutes ago', { name: 'Francisco' }, 1],
  ['Francisco, it arrived 5 minutes ago', '{0} :name, it just arrived|{1} :name, it arrived one minute ago|[2,*] :name, it arrived :count minutes ago', { name: 'Francisco' }, 5],
])('translates plurization with "trans_choice" helper', async (expected, message, replacements, number) => {
  const wrapper = await global.mountPlugin()

  expect(trans_choice(message, number, replacements)).toBe(expected)
})

it('translates even using the mixin "$tChoice()', async () => {
  const wrapper = await global.mountPlugin(
    `<h1>{{ $tChoice('{1} :count minute ago|[2,*] :count minutes ago', 3)}}</h1>`
  )

  expect(wrapper.html()).toBe('<h1>há 3 minutos</h1>');
})

it('translates even using an alias "trans_choice"', async () => {
  await global.mountPlugin()

  expect(trans_choice('{1} :count minute ago|[2,*] :count minutes ago', 3))
    .toBe('há 3 minutos');
})

it('translates "wTransChoice" and test language change values', async () => {
  await global.mountPlugin()

  const translation = wTransChoice('{1} :count minute ago|[2,*] :count minutes ago', 3)
  expect(translation.value)
    .toBe('há 3 minutos');

  await loadLanguageAsync('en');

  expect(translation.value)
    .toBe('3 minutes ago');
})

it.each([
    ['en-US', 0, 'second'],
    ['en_US', 1, 'first'],
    ['en', 2, 'second'],
    ['fr', 0, 'first'],
    ['fr', 1, 'first'],
    ['fr', 2, 'second'],
    ['be', 0, 'third'],
    ['be', 1, 'first'],
    ['be', 3, 'second'],
    ['sk', 0, 'third'],
    ['sk', 1, 'first'],
    ['sk', 2, 'second'],
    ['ga', 0, 'third'],
    ['ga', 1, 'first'],
    ['ga', 2, 'second'],
    ['lt', 0, 'third'],
    ['lt', 1, 'first'],
    ['lt', 2, 'second'],
    ['sl', 0, 'fourth'],
    ['sl', 1, 'first'],
    ['sl', 2, 'second'],
    ['sl', 4, 'third'],
    ['mk', 0, 'second'],
    ['mk', 1, 'first'],
    ['mt', 0, 'second'],
    ['mt', 1, 'first'],
    ['mt', 11, 'third'],
    ['mt', 21, 'fourth'],
    ['lv', 0, 'first'],
    ['lv', 1, 'second'],
    ['lv', 2, 'third'],
    ['pl', 0, 'third'],
    ['pl', 1, 'first'],
    ['pl', 2, 'second'],
    ['cy', 0, 'fourth'],
    ['cy', 1, 'first'],
    ['cy', 2, 'second'],
    ['cy', 8, 'third'],
    ['ro', 0, 'second'],
    ['ro', 1, 'first'],
    ['ro', 21, 'third'],
    ['ar', 0, 'first'],
    ['ar', 1, 'second'],
    ['ar', 2, 'third'],
    ['ar', 3, 'fourth'],
    ['ar', 12, 'fifth'],
    ['ar', 99.1, 'sixth'],
    ['az', 0, 'first'],
    ['az', 1, 'first'],
    ['random', 0, 'first'],
])('translates each lang with the correct plural', (lang, number, correctMessage) => {
  const message = 'first|second|third|fourth|fifth|sixth';

  expect(choose(message, number, lang)).toBe(correctMessage);
});
