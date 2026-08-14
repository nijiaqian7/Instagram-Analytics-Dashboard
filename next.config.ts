import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cloudflare Tunnel domains to access the dev server
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
