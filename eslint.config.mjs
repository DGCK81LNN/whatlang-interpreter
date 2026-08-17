import js from "@eslint/js"
import { defineConfig, includeIgnoreFile } from "eslint/config"
import mochaPlugin from "eslint-plugin-mocha"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  includeIgnoreFile(import.meta.dirname + "/.gitignore"),
  {
    extends: [js.configs.recommended],
  },
  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.recommendedTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ["test/**/*.ts"],
    ...mochaPlugin.configs.recommended,
  },
  {
    files: ["**/.*rc.mjs", "**/*.config.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    rules: {
      "prefer-const": ["error", {
        destructuring: "all",
      }],
    },
  },
])
