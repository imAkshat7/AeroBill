const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: ['node_modules/', '.expo/', 'android/', 'ios/', 'dist/']
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      
      // Offline-Only Strict Guard Rules
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'AeroBill (InvoiceMate) is 100% offline-only. HTTP network requests via global fetch are prohibited.'
        },
        {
          name: 'XMLHttpRequest',
          message: 'AeroBill (InvoiceMate) is 100% offline-only. HTTP network requests via XMLHttpRequest are prohibited.'
        }
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message: 'AeroBill (InvoiceMate) is 100% offline-only. Axios requests are prohibited.'
            }
          ],
          patterns: [
            {
              group: ['axios/*', 'got', 'superagent', 'request'],
              message: 'External HTTP libraries are prohibited. All database and settings must reside completely on-device.'
            }
          ]
        }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='fetch']",
          message: 'AeroBill (InvoiceMate) is 100% offline-only. Direct fetch calls are strictly prohibited.'
        }
      ]
    }
  }
];
