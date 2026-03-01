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
  // Experimental features for native modules
  experimental: {
    serverComponentsExternalPackages: ['@tensorflow/tfjs-node', '@mapbox/node-pre-gyp'],
  },
  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  turbopack: {
    resolveAlias: {
      "@prisma/client": "./generated/prisma-client",
      ".prisma/client": "./generated/prisma-client",
    },
    resolveExtensions: [".js", ".jsx", ".ts", ".tsx"],
    // Ignore HTML files from node-pre-gyp
    rules: {
      '*.html': {
        loaders: ['ignore-loader'],
      },
    },
  },
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // Exact match only so @prisma/client/runtime/* still resolves to node_modules
      "@prisma/client$": path.join(__dirname, "generated/prisma-client/default.js"),
      ".prisma/client": path.join(__dirname, "generated/prisma-client"),
    };
    
    // Handle TensorFlow.js native bindings
    if (!isServer) {
      // Don't resolve these modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    
    // Ignore .html files from node-pre-gyp
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.html$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/[hash][ext]',
      },
    });
    
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'stripe': 'commonjs stripe',
        '@tensorflow/tfjs-node': 'commonjs @tensorflow/tfjs-node',
        '@mapbox/node-pre-gyp': 'commonjs @mapbox/node-pre-gyp',
      });
    }
    return config;
  },
};

module.exports = nextConfig;

