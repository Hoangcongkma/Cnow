// ESLint (flat config). Định dạng code do Prettier lo (eslint-config-prettier tắt các luật trùng).
const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['node_modules/**', 'public/vendor/**', 'content/_checks/**', 'uploads/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    // Server, scripts, test: Node.js CommonJS
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-console': 'off',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // JavaScript chạy trên trình duyệt (CSP: file riêng, không inline)
    files: ['public/js/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
  },
  {
    // DOM giả lập dùng khi chạy thử bài học
    files: ['scripts/lib/dom-stub.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
];
