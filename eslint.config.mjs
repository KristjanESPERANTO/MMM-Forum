import eslintPluginImport from "eslint-plugin-import";
import eslintPluginJs from "@eslint/js";
import eslintPluginJson from "@eslint/json";
import eslintPluginMarkdown from "@eslint/markdown";
import eslintPluginStylistic from "@stylistic/eslint-plugin";
import globals from "globals";

const config = [
  eslintPluginImport.flatConfigs.recommended,
  eslintPluginJs.configs.all,
  ...eslintPluginMarkdown.configs.recommended,
  {
    "files": ["**/*.md"],
    "language": "markdown/gfm",
    "plugins": {
      eslintPluginMarkdown
    },
    "rules": {
      "logical-assignment-operators": "off",
      "markdown/no-missing-label-refs": "off",
      "max-lines-per-function": "off",
      "no-irregular-whitespace": "off"
    }
  },
  {
    "files": ["**/*.json"],
    "ignores": ["package-lock.json"],
    "language": "json/json",
    ...eslintPluginJson.configs.recommended,
    "rules": {
      "logical-assignment-operators": "off",
      "max-lines-per-function": "off",
      "no-irregular-whitespace": "off"
    }
  },
  {
    "files": ["**/*.js"],
    "languageOptions": {
      "ecmaVersion": "latest",
      "globals": {
        ...globals.browser,
        ...globals.node
      },
      "sourceType": "commonjs"
    },
    "plugins": {
      ...eslintPluginStylistic.configs["all-flat"].plugins
    },
    "rules": {
      ...eslintPluginStylistic.configs["all-flat"].rules,
      "@stylistic/array-element-newline": ["error", "consistent"],
      "@stylistic/dot-location": ["error", "property"],
      "@stylistic/function-call-argument-newline": ["error", "consistent"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/lines-around-comment": "off",
      "@stylistic/multiline-comment-style": "off",
      "@stylistic/no-multi-spaces": ["error", {"ignoreEOLComments": true}],
      "@stylistic/object-property-newline": "off",
      "@stylistic/padded-blocks": ["error", "never"],
      "@stylistic/quote-props": ["error", "as-needed"],
      "capitalized-comments": "off",
      "consistent-this": "off",
      "default-case": "off",
      "func-style": "off",
      "init-declarations": "off",
      "line-comment-position": "off",
      "max-lines": "off",
      "max-lines-per-function": ["error", 200],
      "max-params": "off",
      "max-statements": ["error", 100],
      "multiline-comment-style": "off",
      "no-await-in-loop": "off",
      "no-inline-comments": "off",
      "no-magic-numbers": "off",
      "no-ternary": "off",
      "no-undef": "warn",
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
    "plugins": {
      ...eslintPluginStylistic.configs["all-flat"].plugins
    },
    "rules": {
      ...eslintPluginStylistic.configs["all-flat"].rules,
      "@stylistic/array-element-newline": "off",
      "@stylistic/indent": ["error", 2],
      "@stylistic/padded-blocks": ["error", "never"],
      "func-style": "off",
      "max-lines-per-function": ["error", 100],
      "no-magic-numbers": "off",
      "one-var": "off",
      "prefer-destructuring": "off"
    }
  }
];

export default config;