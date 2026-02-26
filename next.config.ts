import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "local-origin.dev",
    "*.local-origin.dev",
    "180.232.135.252",
    "180.232.135.252:3000",
    "180.232.135.252:9000",
    "180.232.135.251",
    "180.232.135.251:3000",
    "180.232.135.251:9000",
    "localhost",
    "localhost:3000",
    "192.168.0.102",
    "192.168.0.102:3000",
  ],
};

export default nextConfig;
