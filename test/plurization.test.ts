import { trans_choice } from '../src';

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
])('translates plurization with "trans_choice" helper', async (expected, message, number) => {
  const wrapper = await global.mountPlugin()

  expect(trans_choice(message, number)).toBe(expected)
})

it.each([
  ['Francisco, it just arrived', '{0} :name, it just arrived|{1} :name, it arrived one minute ago|[2,*] :name, it arrived :count minutes ago', { name: 'Francisco' }, 0],
  ['Francisco, it arrived one minute ago', '{0} :name, it just arrived|{1} :name, it arrived one minute ago|[2,*] :name, it arrived :count minutes ago', { name: 'Francisco' }, 1],
  ['Francisco, it arrived 5 minutes ago', '{0} :name, it just arrived|{1} :name, it arrived one minute ago|[2,*] :name, it arrived :count minutes ago', { name: 'Francisco' }, 5],
])('translates plurization with "trans_choice" helper', async (expected, message, replacements, number) => {
  const wrapper = await global.mountPlugin()

  expect(trans_choice(message, number, replacements)).toBe(expected)
})
