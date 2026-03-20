/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "s3-alpha-sig.figma.com",
      },
      {
        protocol: "https",
        hostname: "player.vimeo.com",
      },
      {
        protocol: "https",
        hostname: "flagsapi.com",
      },
      {
        protocol: "https",
        hostname: "prototype.metropoly.io",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
      },
    ], // Add domains you want to allow images from
  },
};

export default nextConfig;
