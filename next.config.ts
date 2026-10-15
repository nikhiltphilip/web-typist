import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // `npm run dev` uses .next-dev and `npm run preview` .next-prod: a build
  // writes into .next even with another distDir, which corrupts a running
  // dev server if it shares that folder.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // STATIC_EXPORT=1 writes a plain static site to out/ (for Cloudflare Pages
  // or any static host). Every page is prerendered; nothing needs a server.
  output: process.env.STATIC_EXPORT ? "export" : undefined,
  experimental: {
    // Font Awesome's icon packs are barrel files with thousands of exports.
    optimizePackageImports: ["@fortawesome/free-solid-svg-icons"],
  },
};

export default nextConfig;
