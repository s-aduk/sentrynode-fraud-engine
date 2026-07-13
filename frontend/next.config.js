/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export: the frontend is a pure client calling API Gateway
  // directly. No server-side rendering needed, keeps hosting Free Tier
  // friendly (S3 + CloudFront, or Amplify static hosting).
  output: "export",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
