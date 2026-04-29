import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["mongoose", "puppeteer"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/carrer", destination: "/careers", permanent: true },
      { source: "/carrers", destination: "/careers", permanent: true },
    ];
  },
};

export default nextConfig;
