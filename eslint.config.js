// ESLint (flat config). Định dạng code do Prettier lo (eslint-config-prettier tắt các luật trùng).
// eslint-plugin-security: phát hiện mẫu code nguy hiểm (RegExp động, child_process, eval, đường dẫn file từ biến…).
// eslint-plugin-n: dùng API Node.js đúng phiên bản trong "engines" (>= 20), require đúng gói đã khai báo.
const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');
const security = require('eslint-plugin-security');
const n = require('eslint-plugin-n');

module.exports = [
  {
    ignores: ['node_modules/**', 'public/vendor/**', 'content/_checks/**', 'uploads/**', 'coverage/**', 'backups/**'],
  },
  js.configs.recommended,
  security.configs.recommended,
  n.configs['flat/recommended-script'],
  {
    // Server, scripts, test: Node.js CommonJS
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Báo mọi truy cập obj[biến] → quá nhiều cảnh báo sai. Khóa động trong code đều lấy từ whitelist/hằng số,
      // dữ liệu người dùng đã qua zod (loại trường lạ) và không có chỗ nào gộp object người dùng vào object khác.
      'security/detect-object-injection': 'off',
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-console': 'off',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Script dòng lệnh và kiểm thử: được thoát tiến trình, được dùng devDependencies
    files: ['scripts/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    rules: {
      'n/no-process-exit': 'off',
      'n/no-unpublished-require': 'off',
      // Đường dẫn file do người vận hành / chính repo cung cấp (thư mục content, backup…), không đến từ người dùng web
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    // Kiểm thử: tạo RegExp từ dữ liệu test, không chạy trên máy chủ
    files: ['test/**/*.js'],
    rules: { 'security/detect-non-literal-regexp': 'off', 'security/detect-possible-timing-attacks': 'off' },
  },
  {
    // JavaScript chạy trên trình duyệt (CSP: file riêng, không inline)
    files: ['public/js/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
    rules: { 'n/no-unsupported-features/node-builtins': 'off' },
  },
  {
    // DOM giả lập dùng khi chạy thử bài học
    files: ['scripts/lib/dom-stub.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
];
