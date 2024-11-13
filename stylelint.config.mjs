const config = {
  "extends": ["stylelint-config-standard"],
  "plugins": ["stylelint-prettier"],
  "root": true,
  "rules": {
    "prettier/prettier": true,
    "selector-class-pattern": [
      "^(?:[a-z]+(-[a-z]+)*|MMM-Forum)$",
      {
        "message": "Selector should be written in kebab-case"
      }
    ]
  }
};

export default config;
