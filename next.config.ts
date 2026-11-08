import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  // TON libraries (swap module) need Buffer in the browser.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any, { isServer, webpack }: any) => {
    if (!isServer) {
      config.resolve.fallback = { ...(config.resolve.fallback || {}), buffer: "buffer/" };
      config.plugins.push(new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }));
    }
    return config;
  }
};
export default nextConfig;
