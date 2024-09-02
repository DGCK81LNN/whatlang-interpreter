import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config({
  files: ["src/**/*.ts"],
  extends: [
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ],
  rules: {
    "eqeqeq": "warn",
    "no-else-return": ["warn", { allowElseIf: false }],
    "no-extra-label": "error",
    "no-lone-blocks": "warn",
    "no-multi-str": "error",
    "no-return-assign": "warn",
    "no-self-compare": "warn",
    "no-unneeded-ternary": "warn",
    "no-unused-expressions": "warn",
    "no-use-before-define": ["error", { functions: false }],
    "no-useless-assignment": "warn",
    "no-var": "error",
    "no-void": "error",
    "one-var": ["error", { initialized: "never" }],
    "operator-assignment": ["error", "always"],
    "prefer-exponentiation-operator": "warn",
    "require-atomic-updates": "error",
    "symbol-description": "warn",
    "yoda": ["warn", "never"],
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "allow-as-parameter",
      },
    ],
    "@typescript-eslint/naming-convention": [
      "warn",
      {
        selector: "default",
        format: ["camelCase", "UPPER_CASE"],
        leadingUnderscore: "allow",
        trailingUnderscore: "allow",
      },
      {
        selector: ["import", "typeMethod", "typeProperty"],
        format: ["camelCase", "PascalCase", "UPPER_CASE"],
      },
      {
        selector: "typeLike",
        format: ["PascalCase"],
      },
      {
        selector: ["objectLiteralMethod", "objectLiteralProperty"],
        format: null,
      },
    ],
    "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
    "@typescript-eslint/no-unnecessary-template-expression": "warn",
    "@typescript-eslint/no-unnecessary-type-arguments": "warn",
    "@typescript-eslint/no-unnecessary-type-parameters": "warn",
  },
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  linterOptions: {
    reportUnusedDisableDirectives: "warn",
  },
})
