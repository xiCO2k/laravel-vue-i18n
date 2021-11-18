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
  moduleFileExtensions: ['vue', 'js', 'json', 'jsx', 'ts', 'tsx', 'node']
}
