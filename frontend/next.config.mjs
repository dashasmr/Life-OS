/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  /** Browser calls same-origin `/life-os-api/*`; Next proxies to uvicorn (avoids direct 127.0.0.1 fetch issues). */
  async rewrites() {
    return [
      {
        source: "/life-os-api/:path*",
        destination: "http://127.0.0.1:8765/:path*"
      }
    ];
  }
};

export default nextConfig;
