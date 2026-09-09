import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "contracts/**", // Solidity + a vendored Foundry dependency tree, not ours to lint
      "relay/handler_cre/**", // separate Bun/CRE project, its own toolchain (bun test, cre CLI)
    ],
  },
  ...tseslint.configs.recommended,
);
