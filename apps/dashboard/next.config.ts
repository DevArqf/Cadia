import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["@cadia/ipc"],
  async rewrites() {
    return [
      { source: "/servers", destination: "/" },
      { source: "/manage/:path*", destination: "/" },
      { source: "/premium", destination: "/" },
      { source: "/about", destination: "/" },
      { source: "/terms", destination: "/" },
      { source: "/privacy", destination: "/" },
      { source: "/faq", destination: "/" },
      { source: "/admin", destination: "/" },
    ];
  },
};

export default nextConfig;
