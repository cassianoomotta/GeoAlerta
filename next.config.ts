import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright can run an isolated local server while the developer's .next
  // instance remains open on localhost:3000.
  distDir: process.env.CORE_TEST_NEXT_DIST_DIR || '.next',
};

export default nextConfig;
