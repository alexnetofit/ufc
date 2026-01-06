/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mmaapi.p.rapidapi.com',
        pathname: '/api/mma/team/**',
      },
    ],
  },
};

module.exports = nextConfig;







