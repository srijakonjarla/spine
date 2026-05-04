import type { NextConfig } from "next";
import path from "path";

const projectRoot = path.resolve(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@spine/shared"],
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    remotePatterns: [
      // Hardcover (primary book metadata source)
      { protocol: "https", hostname: "assets.hardcover.app" },
      // Google Books (fallback)
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
      // Goodreads / Amazon-hosted covers from CSV imports
      { protocol: "https", hostname: "i.gr-assets.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
    ],
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
