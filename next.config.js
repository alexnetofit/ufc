/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
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








