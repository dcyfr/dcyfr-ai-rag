// Self-contained ESLint configuration (no workspace-root imports).
// Uses typescript-eslint strict preset — @eslint/js is not required separately.
import tseslint from 'typescript-eslint';

export default [
  // Ignore generated and vendored files
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.config.*'],
  },
  // TypeScript recommended rules (includes essential JS rules)
  ...tseslint.configs.recommended,
  // Project-specific rule overrides (strict mode)
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      // Disabled: causes TypeError in this package
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
];
