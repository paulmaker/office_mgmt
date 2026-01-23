import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack is enabled by default in Next.js 16
  // Add empty config to silence warning
  turbopack: {},
  devIndicators: false,
};

export default nextConfig;
