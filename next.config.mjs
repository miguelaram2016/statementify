/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the legacy optional server-side PDF parser external to Turbopack.
  // The primary statement extraction path remains in the browser.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
