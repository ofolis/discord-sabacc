import love from "eslint-config-love";

export default [
  {
    ...love,
    files: ["**/*.js", "**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
];

