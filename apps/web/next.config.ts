import type { NextConfig } from "next";
import path from "path";

const projectRoot = path.resolve(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@spine/shared"],
  turbopack: {
    root: workspaceRoot,
  },
  webpack: (config) => {
    config.resolve.modules = [
      path.join(projectRoot, "node_modules"),
      path.join(workspaceRoot, "node_modules"),
      "node_modules",
    ];
    return config;
  },
};

export default nextConfig;
