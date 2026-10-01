module.exports = {
  extends: ["next/core-web-vitals", "eslint:recommended"],
  rules: {
    "no-console": "error",
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
};
