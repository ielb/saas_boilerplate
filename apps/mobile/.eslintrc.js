module.exports = {
  extends: ['../../.eslintrc.js', '@react-native', '@react-native/typescript'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-unused-styles': 'error',
  },
  ignorePatterns: ['.expo/', 'dist/', 'coverage/', '*.js'],
};
