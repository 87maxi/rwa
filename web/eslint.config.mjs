import eslintConfigNext from "eslint-config-next";

const eslintConfig = [
  ...eslintConfigNext,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  // Disable set-state-in-effect rule - the mounted pattern is valid for hydration safety
  // when using client-only components with wallet adapters
  {
    rules: {
      "react/set-state-in-effect": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
