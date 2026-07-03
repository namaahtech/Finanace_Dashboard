import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // @sparticuz/chromium + puppeteer-core must stay external so the Chromium binary
  // ships intact to the serverless function (bundling it breaks executablePath()).
  serverExternalPackages: ["mongoose", "puppeteer", "puppeteer-core", "@sparticuz/chromium", "pdfjs-dist"],
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
