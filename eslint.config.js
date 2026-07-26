import globals from "globals";

export default [
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["*.js"],
    ignores: ["theme-init.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.browser,
        maplibregl: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
  {
    // Loaded as a plain blocking <script> (not type="module") so the CSP
    // can stay free of 'unsafe-inline' — see index.html's comment.
    files: ["theme-init.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      eqeqeq: "error",
    },
  },
  {
    files: ["tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
];
