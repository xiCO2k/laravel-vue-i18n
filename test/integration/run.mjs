import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = fileURLToPath(new URL('../../', import.meta.url))
const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'laravel-vue-i18n-consumers-')))
const profiles = process.argv.slice(2).length ? process.argv.slice(2) : ['4', '5', '6', '7', '8', 'plus', 'mix']
const npm = (args, cwd) =>
  execFileSync(process.execPath, [process.env.npm_execpath, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' })
const write = (root, file, content) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
  fs.writeFileSync(path.join(root, file), content)
}
const php = (text) => "<?php return ['hello' => '" + text + "'];"

try {
  npm(['run', 'build'], repository)
  const packOutput = npm(['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], repository)
  const packed = JSON.parse(packOutput.slice(packOutput.lastIndexOf('\n[') + 1))
  const tarball = path.join(temporary, packed[0].filename)
  for (const profile of profiles) {
    assert(['4', '5', '6', '7', '8', 'plus', 'mix'].includes(profile), 'Unknown profile: ' + profile)
    const root = path.join(temporary, profile)
    fs.mkdirSync(root)
    const dependencies = {
      'laravel-vue-i18n': 'file:' + tarball,
      vue: '3.5.42',
      jsdom: '30.0.1',
      typescript: '5.9.3',
      '@types/node': '22.20.2'
    }
    const manifest = {
      name: 'i18n-consumer-' + profile,
      private: true,
      type: profile === 'mix' ? 'commonjs' : 'module',
      dependencies
    }
    if (profile === '8') dependencies['typescript-current'] = 'npm:typescript@7.0.2'
    if (profile === '4') dependencies['typescript-legacy'] = 'npm:typescript@4.9.5'
    if (profile === 'mix') {
      dependencies['laravel-mix'] = '6.0.49'
      dependencies.webpack = '5.99.9'
    } else {
      dependencies.vite = profile === 'plus' ? 'npm:@voidzero-dev/vite-plus-core@0.3.1' : profile
      dependencies['@vitejs/plugin-vue'] = profile === '4' ? '4.6.2' : '6.0.8'
      dependencies['laravel-vite-plugin'] = {
        4: '0.8.1',
        5: '1.3.0',
        6: '1.3.0',
        7: '2.1.0',
        8: '3.2.0',
        plus: '3.2.0'
      }[profile]
      if (profile === 'plus') {
        dependencies['vite-plus'] = '0.3.1'
        manifest.overrides = { vite: '$vite', vitest: '4.1.11' }
      }
    }
    write(root, 'package.json', JSON.stringify(manifest, null, 2))
    npm(['install', '--no-audit', '--no-fund'], root)
    write(root, 'lang/en/messages.php', php('PHP_TRANSLATION'))
    write(root, 'lang/en.json', '{"hello":"JSON_TRANSLATION"}')
    for (const file of ['consumer.mjs', 'browser.mjs']) {
      fs.copyFileSync(new URL(file, import.meta.url), path.join(root, file))
    }
    if (profile === 'mix') {
      execFileSync(process.execPath, ['--input-type=module', '-e', "import('laravel-vue-i18n/mix')"], {
        cwd: root,
        stdio: 'pipe'
      })
      write(
        root,
        'webpack.mix.js',
        "const mix = require('laravel-mix'); require('laravel-vue-i18n/mix'); mix.setPublicPath('public').js('main.js', 'app.js').i18n().disableNotifications();"
      )
      write(
        root,
        'main.js',
        "const {createApp,h}=require('vue'); const {i18nVue}=require('laravel-vue-i18n'); createApp({render(){return h('p', this.$t('messages.hello') + ' / ' + this.$t('hello'))}}).use(i18nVue,{lang:'en',resolve:lang=>require('./lang/'+lang+'.json')}).mount('#app');"
      )
      npm(['exec', '--', 'mix', '--production', '--no-progress'], root)
      const output = execFileSync(process.execPath, ['browser.mjs', 'mix'], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe'
      })
      console.log('PASS Mix 6: CommonJS registration, PHP/JSON build, browser translations. ' + output.trim())
    } else {
      write(root, 'App.vue', '<template><p>{{ $t("messages.hello") }} / {{ $t("hello") }}</p></template>')
      write(
        root,
        'main.js',
        "import {createApp} from 'vue'; import {i18nVue} from 'laravel-vue-i18n'; import App from './App.vue'; const langs=import.meta.glob('./lang/*.json'); createApp(App).use(i18nVue,{lang:'en',resolve:async lang=>await langs['./lang/'+lang+'.json']()}).mount('#app');"
      )
      write(
        root,
        'ssr.js',
        "import {I18n} from 'laravel-vue-i18n'; const langs=import.meta.glob('./lang/*.json',{eager:true}); const i=new I18n({lang:'en',resolve:lang=>langs['./lang/'+lang+'.json']?.default||{}}); export const actual=i.trans('messages.hello')+' / '+i.trans('hello');"
      )
      write(
        root,
        'vite.config.mjs',
        "import {defineConfig} from '" +
          (profile === 'plus' ? 'vite-plus' : 'vite') +
          "'; import vue from '@vitejs/plugin-vue'; import laravel from 'laravel-vite-plugin'; import i18n from 'laravel-vue-i18n/vite'; export default defineConfig({plugins:[vue(),laravel({input:'main.js'}),i18n()]});"
      )
      const output = execFileSync(process.execPath, ['consumer.mjs', profile], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe'
      })
      console.log(output.trim())
    }
  }
} catch (error) {
  console.error('Consumer fixtures retained at ' + temporary)
  if (error.stdout) console.error(error.stdout.toString())
  if (error.stderr) console.error(error.stderr.toString())
  throw error
}
fs.rmSync(temporary, { recursive: true, force: true })
