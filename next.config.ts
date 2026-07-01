import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["mongoose", "puppeteer", "pdfjs-dist"],
  webpack(config) {
    // pdfjs-dist needs canvas alias to prevent server-side canvas import errors
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
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
