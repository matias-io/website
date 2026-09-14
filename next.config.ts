import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === 'development' ? undefined : 'export',
  trailingSlash: true,
  devIndicators: false,
  agentRules: false,
  ...(process.env.NODE_ENV === 'development'
    ? {
        rewrites: () => [
          { source: '/api/:path*', destination: 'http://127.0.0.1:3301/api/:path*' },
        ],
      }
    : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
