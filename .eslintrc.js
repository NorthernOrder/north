module.exports = {
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 0,
  },
};
