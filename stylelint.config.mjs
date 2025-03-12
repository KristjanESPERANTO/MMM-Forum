const config = {
  "extends": ["stylelint-config-standard", "stylelint-prettier/recommended"],
  "root": true,
  "rules": {
    "selector-class-pattern": [
      "^(?:[a-z]+(-[a-z]+)*|MMM-Forum)$",
      {
        "message": "Selector should be written in kebab-case"
      }
    ]
  }
};

export default config;
