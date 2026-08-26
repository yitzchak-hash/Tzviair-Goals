import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

if (process.env.VERCEL) {
  nextConfig.output = "export";
}

export default nextConfig;
