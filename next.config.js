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
      '.prisma/client': './node_modules/.prisma/client',
    },
    // Mark stripe as external to avoid build-time resolution
    resolveExtensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  // Webpack configuration for optional dependencies
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Make stripe optional on server-side
      config.externals = config.externals || [];
      config.externals.push({
        'stripe': 'commonjs stripe',
      });
    }
    return config;
  },
};

module.exports = nextConfig;

