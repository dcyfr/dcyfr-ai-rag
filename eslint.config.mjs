// Extends shared workspace base config.
// See eslint.config.base.mjs at workspace root for common settings.
import { createStrictConfig } from '../eslint.config.base.mjs';

export default createStrictConfig({
  // Strict mode: no-explicit-any and no-unused-vars are 'error' (inherited from base)
  customRules: {
    // Disable problematic rule causing TypeError in this package
    '@typescript-eslint/no-unused-expressions': 'off',
  },
});
