import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile the shared, source-only UI package (JIT) as part of this app.
  transpilePackages: ["@repo/ui"],
};

export default nextConfig;
