/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/auth", "@repo/api-client", "@repo/schemas", "@repo/utils"],
  experimental: {
    optimizePackageImports: ["@tanstack/react-query"],
  },
};

module.exports = nextConfig;
