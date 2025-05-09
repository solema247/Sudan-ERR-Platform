/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');
const path = require('path');
const fs = require('fs');

// Copy PDF worker to public directory
const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const workerDest = path.join(process.cwd(), 'public', 'pdf.worker.min.js');

// Ensure the worker file is copied
try {
  fs.copyFileSync(workerPath, workerDest);
} catch (err) {
  console.error('Error copying PDF worker:', err);
}

const nextConfig = {
    i18n: {
        ...i18n,
        defaultLocale: 'ar',
        locales: ['ar', 'en', 'es']
    },
    webpack: (config) => {
        config.resolve.alias.canvas = false
        return config
    },
    // Add rewrites to handle service worker
    async rewrites() {
        return [
            {
                source: '/sw.js',
                destination: '/_next/static/sw.js'
            }
        ];
    },
    async headers() {
        return [
            {
                source: '/sw.js',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, max-age=0'
                    },
                    {
                        key: 'Service-Worker-Allowed',
                        value: '/'
                    },
                    {
                        key: 'Content-Type',
                        value: 'application/javascript; charset=utf-8'
                    }
                ]
            }
        ];
    }
};

module.exports = nextConfig;

