import js from "@eslint/js"
import globals from "globals"

export default [
    js.configs.recommended,
    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: { globals: { ...globals.browser, Phaser: "readonly" } },
        rules: {
            "no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_"
                }
            ]
        }
    }
]
