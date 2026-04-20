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
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "images-us.bookshop.org" },
      { protocol: "https", hostname: "**.hardcover.app" },
    ],
  },
};

export default nextConfig;
