import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  rules: {
    'no-console': 'off',
    'max-len': ['warn', { code: 125, tabWidth: 2 }],
    'linebreak-style': ['error', 'unix'],
  },
})
