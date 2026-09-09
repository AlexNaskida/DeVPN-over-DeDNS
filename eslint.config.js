import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "contracts/**", // Solidity + a vendored Foundry dependency tree, not ours to lint
    ],
  },
  ...tseslint.configs.recommended,
);
