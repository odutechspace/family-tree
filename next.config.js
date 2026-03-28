/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bullmq", "ioredis"],
};

module.exports = nextConfig;
