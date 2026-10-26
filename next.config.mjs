/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // Cross-origin isolation (enables SharedArrayBuffer) plus correct binary
  // headers for .tflite/.wasm. Note that the inference worker explicitly opts
  // OUT of the multi-threaded TFLite runtime regardless of these headers; see
  // src/workers/inference.worker.ts.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
      {
        // Serve .tflite and .wasm files with correct binary headers from Vercel Edge CDN
        source: "/models/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "application/octet-stream",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // Treat .tflite and .wasm as binary assets
    config.module.rules.push({
      test: /\.(tflite|wasm)$/,
      type: "asset/resource",
    });

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
