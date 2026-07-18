/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/api/pdf/generate': ['./node_modules/@sparticuz/chromium/bin/**/*'],
  },
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








