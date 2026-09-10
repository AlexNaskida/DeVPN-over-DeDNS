import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/ui and packages/session-spec are workspace TS sources, not
  // pre-built - Next needs to transpile them itself.
  transpilePackages: ["@dvod/session-spec"],
};

export default nextConfig;
