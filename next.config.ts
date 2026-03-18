import type { NextConfig } from "next";
import path from "path";

const root = path.resolve(__dirname);

const nextConfig: NextConfig = {
  turbopack: {
    root,
  },
  webpack: (config) => {
    config.resolve.modules = [path.join(root, "node_modules"), "node_modules"];
    return config;
  },
};

export default nextConfig;
