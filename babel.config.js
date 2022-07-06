module.exports = {
  plugins: ['babel-plugin-transform-vite-meta-env', '@vue/babel-plugin-jsx'],
  presets: [
    ['@babel/preset-env',
      {
        targets: {
          node: 'current'
        }
      }
    ]
  ]
}
