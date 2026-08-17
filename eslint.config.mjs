import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"

export default defineConfig({
  files: ["src/**/*.ts"],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    parserOptions: {
      projectService: true,
    },
  },
  rules: {
    "prefer-const": ["error", {
        destructuring: "all",
      }],
    },
  },
})
