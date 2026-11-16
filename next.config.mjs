/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/", destination: "/cursor", permanent: false }];
  },
};

export default nextConfig;
