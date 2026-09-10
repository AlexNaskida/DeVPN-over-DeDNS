import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.open-next/**", // OpenNext/Cloudflare build output, gitignored, not ours to lint
      "**/.wrangler/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/next-env.d.ts", // Next-generated, gitignored, not ours to lint
      "contracts/**", // Solidity + a vendored Foundry dependency tree, not ours to lint
      "relay/handler_cre/**", // separate Bun/CRE project, its own toolchain (bun test, cre CLI)
    ],
  },
  ...tseslint.configs.recommended,
);
