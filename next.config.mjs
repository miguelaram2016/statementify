/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdf2json"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle these packages - load them from node_modules at runtime
      config.externals = config.externals || [];
      config.externals.push("pdf2json", "pdf-parse");
    }
    return config;
  },
};

export default nextConfig;
