import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['build/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // the parser is written for speed and size: `any` is used deliberately to
      // skip casts in hot paths, and the public option types are open on purpose
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
