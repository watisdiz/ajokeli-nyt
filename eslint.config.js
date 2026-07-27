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
      // Arguments prefixed with _ are intentionally unused: they exist to
      // document a signature we have to match (e.g. a stubbed library API).
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
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
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
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
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
];
