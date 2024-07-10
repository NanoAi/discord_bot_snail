import { ESLint } from 'eslint';

export default new ESLint({
  baseConfig: {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    env: {
      es6: true,
      node: true,
      browser: true,
    },
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
    ],
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
      'prettier/prettier': [
        'error',
        {
          useTabs: false,
          singleQuote: true,
          semi: false,
          tabWidth: 2,
        },
      ],
    },
  },
});
