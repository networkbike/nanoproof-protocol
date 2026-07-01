import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nanoproof/shared", "@nanoproof/agent"],
  // typedRoutes disabled because we have many dynamic hrefs (e.g. dashboard
  // pages receiving creator IDs). Enabling it would force every <Link> to
  // hard-code a known route literal. Re-enable when the dashboard surfaces
  // are stable and we can codify the dynamic shapes.
  webpack: (cfg) => {
    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.extensionAlias = {
      ...(cfg.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return cfg;
  },
};

export default config;