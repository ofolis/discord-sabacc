/* eslint-disable @typescript-eslint/naming-convention */
// @ts-check

import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import onlyProtectedBracketAccess from "./eslint-rules/only-protected-bracket-access.mjs";

export default tseslint.config(
  {
    ignores: ["build/**/*", "dist/**/*"],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.mjs", "eslint-rules/*.mjs"],
          defaultProject: "tsconfig.json",
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "custom-rules": {
        rules: {
          "only-protected-bracket-access": onlyProtectedBracketAccess,
        },
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/explicit-function-return-type": ["error"],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase"],
          leadingUnderscore: "forbid",
        },
        {
          selector: "enumMember",
          format: ["UPPER_CASE"],
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "memberLike",
          format: ["camelCase"],
          leadingUnderscore: "requireDouble",
          modifiers: ["private"],
        },
        {
          selector: "memberLike",
          format: ["camelCase"],
          leadingUnderscore: "require",
          modifiers: ["protected"],
        },
      ],
      "@typescript-eslint/no-extraneous-class": ["off"],
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          ignoreIIFE: false,
          ignoreVoid: false,
        },
      ],
      "@typescript-eslint/no-inferrable-types": ["off"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowNullableObject: false,
          allowNumber: false,
          allowString: false,
        },
      ],
      "@typescript-eslint/typedef": [
        "error",
        {
          variableDeclaration: true,
          variableDeclarationIgnoreFunction: false,
        },
      ],
      complexity: ["error"],
      curly: ["error"],
      "custom-rules/only-protected-bracket-access": "error",
      eqeqeq: ["error"],
      "linebreak-style": ["error", "unix"],
      "require-await": ["error"],
      "lines-between-class-members": ["error", "always"],
    },
  },
  eslintConfigPrettier,
);
