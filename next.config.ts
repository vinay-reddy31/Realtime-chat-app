import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* other config options here */
  eslint: {
    // ignore ESLint errors/warnings during production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
