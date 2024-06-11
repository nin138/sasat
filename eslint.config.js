// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from "eslint-plugin-prettier/recommended";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: {
            "prettier/recommended": prettier,
        },
    }
);