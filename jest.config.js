const path = require('path')

module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      babelConfig: true
    }
  },
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\js$': 'babel-jest'
  },
  moduleFileExtensions: ['vue', 'js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  setupFiles: [path.resolve(__dirname, './test/setup.ts')]
}
