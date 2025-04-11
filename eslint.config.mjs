import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
    {
        files: ["**/*.{js,ts}"], // Target JS and TS files
        languageOptions: {
            globals: globals.browser, // Browser globals (adjust as needed)
            parser: tseslint.parser, // Add TypeScript parser
            parserOptions: {
                project: "./tsconfig.json", // Required for type-aware linting
                sourceType: "module", // For ES modules
            },
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin, // Add TypeScript plugin
        },
        extends: [
            js.configs.recommended, // Base JS recommended rules
            ...tseslint.configs.recommended, // Spread TypeScript recommended rules
        ],
        rules: {
            // Optional: Customize rules
            "no-unused-vars": "off", // Disable base rule
            "@typescript-eslint/no-unused-vars": ["error"], // Use TS-specific version
        },
    },
]);
