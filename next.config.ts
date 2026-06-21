import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";
import withBundleAnalyzer from "@next/bundle-analyzer";

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
} as Parameters<typeof withPWA>[0]);

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  turbopack: {},
};

const config =
  process.env.ANALYZE === "true"
    ? withBundleAnalyzer({ enabled: true })(nextConfig)
    : nextConfig;

export default pwaConfig(config);
