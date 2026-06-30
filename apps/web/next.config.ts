import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nanoproof/shared"],
  experimental: {
    typedRoutes: true,
  },
};

export default config;