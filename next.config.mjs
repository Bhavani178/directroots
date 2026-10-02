/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Unsplash (existing seed/demo images)
      { protocol: "https", hostname: "images.unsplash.com" },
      // Cloudinary (uploaded product/profile images)
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Unpkg (Leaflet marker icons)
      { protocol: "https", hostname: "unpkg.com" },
    ],
  },
}

export default nextConfig
