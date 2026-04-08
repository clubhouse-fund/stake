/** @type {import('next').NextConfig} */
const nextConfig = {
  // RETAINED: Your existing Reown settings
  transpilePackages: ['@reown/appkit-adapter-wagmi', '@reown/appkit'],
  
  // RETAINED: Static export settings
  output: 'export', 
  images: {
    unoptimized: true, 
  },

  // ADDED: The critical fix for "Unexpected Token <" on refresh
  // This changes /stake.html to /stake/index.html, making it refresh-safe
  trailingSlash: true, 

  // RETAINED: Your unique build ID logic
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },

  // RETAINED: Turbopack experimental settings
  experimental: {
    turbopack: {
      root: '.', 
    },
  },
};

module.exports = nextConfig;