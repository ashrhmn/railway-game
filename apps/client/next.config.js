/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://localhost:${+(
          process.env.API_PORT || "4000"
        )}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
