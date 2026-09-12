import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<div id="app"></div>', { url: 'http://localhost', runScripts: 'outside-only' })
if (process.argv[2] === 'mix') {
  dom.window.eval(fs.readFileSync('public/app.js', 'utf8'))
} else {
  for (const key of [
    'window',
    'document',
    'navigator',
    'Element',
    'HTMLElement',
    'Node',
    'SVGElement',
    'MutationObserver'
  ]) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
  }
  const manifest = JSON.parse(fs.readFileSync('public/build/manifest.json', 'utf8'))
  await import(pathToFileURL(path.resolve('public/build', manifest['main.js'].file)))
}
const deadline = Date.now() + 5000
while (
  dom.window.document.querySelector('#app').textContent !== 'PHP_TRANSLATION / JSON_TRANSLATION' &&
  Date.now() < deadline
) {
  await new Promise((resolve) => setTimeout(resolve, 25))
}
assert.equal(dom.window.document.querySelector('#app').textContent, 'PHP_TRANSLATION / JSON_TRANSLATION')
dom.window.close()
console.log('Rendered expected translations in jsdom.')
