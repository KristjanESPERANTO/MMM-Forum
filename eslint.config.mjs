import css from "@eslint/css";
import {defineConfig} from "eslint/config";
import globals from "globals";
import {flatConfigs as importX} from "eslint-plugin-import-x";
import js from "@eslint/js";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig([
  {"files": ["**/*.css"], "languageOptions": {"tolerant": true}, "plugins": {css}, "language": "css/css", "extends": ["css/recommended"], "rules": {"css/use-baseline": ["error", {"available": "newly"}]}},
  {
    "files": ["**/*.js"],
    "languageOptions": {
      "ecmaVersion": "latest",
      "globals": {
        ...globals.browser,
        ...globals.node
      }
    },
    "plugins": {js, stylistic},
    "extends": [importX.recommended, "js/all", "stylistic/all"],
    "rules": {
      "@stylistic/array-element-newline": ["error", "consistent"],
      "@stylistic/dot-location": ["error", "property"],
      "@stylistic/function-call-argument-newline": ["error", "consistent"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/no-multi-spaces": ["error", {"ignoreEOLComments": true}],
      "@stylistic/padded-blocks": ["error", "never"],
      "@stylistic/quote-props": ["error", "as-needed"],
      "default-case": "off",
      "max-lines": "off",
      "max-lines-per-function": ["error", 200],
      "max-statements": ["error", 100],
      "multiline-comment-style": "off",
      "no-await-in-loop": "off",
      "no-inline-comments": "off",
      "no-magic-numbers": "off",
      "no-ternary": "off",
      "one-var": "off",
      "sort-keys": "off",
      "strict": "off"
    }
  },
  {
    "files": ["**/*.mjs"],
    "languageOptions": {
      "ecmaVersion": "latest",
      "globals": {
        ...globals.node
      },
      "sourceType": "module"
    },
    "plugins": {js, stylistic},
    "extends": [importX.recommended, "js/all", "stylistic/all"],
    "rules": {
      "@stylistic/array-element-newline": ["error", "consistent"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/object-property-newline": ["error", {"allowAllPropertiesOnSameLine": true}],
      "import-x/no-unresolved": ["error", {"ignore": ["eslint/config"]}],
      "no-magic-numbers": ["error", {"ignore": [2, 100, 200]}],
      "sort-keys": "off"
    }
  },
  {"files": ["**/*.json"], "ignores": ["package-lock.json"], "plugins": {json}, "extends": ["json/recommended"], "language": "json/json"},
  {"files": ["**/*.md"], "plugins": {markdown}, "extends": ["markdown/recommended"], "language": "markdown/gfm"}
]);
