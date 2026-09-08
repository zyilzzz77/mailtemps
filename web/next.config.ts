import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["localhost", "127.0.0.1", "100.99.104.45"],
  turbopack: { root: process.cwd() },
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8081";
    return [{ source: "/api/:path*", destination: `${apiTarget}/api/:path*` }];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.mailtemps.space" }],
        destination: "https://mailtemps.space/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/inbox/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
