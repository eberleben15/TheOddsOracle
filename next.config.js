const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a.espncdn.com",
        pathname: "/i/teamlogos/**",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        pathname: "/**",
      },
    ],
  },
  // Allow TypeScript files in node_modules for Prisma
  transpilePackages: ['@prisma/client'],
  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  turbopack: {
    resolveAlias: {
      "@prisma/client": "./generated/prisma-client",
      ".prisma/client": "./generated/prisma-client",
    },
    resolveExtensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // Exact match only so @prisma/client/runtime/* still resolves to node_modules
      "@prisma/client$": path.join(__dirname, "generated/prisma-client/default.js"),
      ".prisma/client": path.join(__dirname, "generated/prisma-client"),
    };
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'stripe': 'commonjs stripe',
      });
    }
    return config;
  },
};

module.exports = nextConfig;

