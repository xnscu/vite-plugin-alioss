/* eslint-env node */
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  root: true,
  globals: {
    exec: "readonly",
    getCurrentPages: "readonly",
    uniCloud: "readonly",
    uni: "readonly",
    wx: "readonly",
    getApp: "readonly",
  },
  env: {
    node: true,
    amd: true,
  },
  rules: {
    "prefer-const": [
      "error",
      {
        destructuring: "all",
        ignoreReadBeforeAssign: false,
      },
    ],
    "no-unused-vars": [
      "warn",
      { vars: "all", args: "after-used", ignoreRestSiblings: false },
    ],
  },
  extends: [
    "eslint:recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    "sourceType": "module"
  },
};
