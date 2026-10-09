/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');
const path = require('path');
const fs = require('fs');

// Copy PDF worker to public only when missing or contents differ.
// Unconditional copyFileSync updates mtime and triggers an infinite Fast Refresh loop.
const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const workerDest = path.join(process.cwd(), 'public', 'pdf.worker.min.js');

try {
  if (fs.existsSync(workerPath)) {
    const needsCopy =
      !fs.existsSync(workerDest) ||
      !fs.readFileSync(workerPath).equals(fs.readFileSync(workerDest));
    if (needsCopy) {
      fs.copyFileSync(workerPath, workerDest);
    }
  }
} catch (err) {
  console.error('Error copying PDF worker:', err);
}

const nextConfig = {
  i18n: {
    ...i18n,
    defaultLocale: 'ar',
    locales: ['ar', 'en', 'es'],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  // Serve public/sw.js directly — do not rewrite to /_next/static/sw.js
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, max-age=0',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
