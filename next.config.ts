import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/_design", destination: "/design" }];
  },
};

export default nextConfig;
