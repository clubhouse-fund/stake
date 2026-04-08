/** @type {import('next').NextConfig} */
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  
  // 1. Tell Next.js to ignore the Type Error in noble-curves
  typescript: {
    ignoreBuildErrors: true,
  },

  // 2. If you still see Webpack errors regarding those wallets
  webpack: (config) => {
    config.externals.push('porto', 'porto/internal', '@gemini-wallet/core');
    return config;
  },

  turbopack: {}, 
};

export default withPWA(nextConfig);