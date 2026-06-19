import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

// Only enable Cloudflare dev mode when not running the production build
if (process.env.NODE_ENV === 'development') {
  import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev()).catch(() => {});
}

export default nextConfig;
