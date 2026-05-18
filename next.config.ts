import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['wp-manager.endusercompute.in'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
