import type { NextConfig } from "next";

const config: NextConfig = {
  // Strict React mode for better error catching
  reactStrictMode: true,

  // Turbopack is default in Next 16
  turbopack: {
    // Workspace root resolution if needed
  },

  // Image optimization domains (R2 public URL, etc.)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "files.jovenesenuk.com",
      },
    ],
  },

  // PWA-friendly headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  // Externalize Drizzle DB driver from the bundle to avoid edge issues
  serverExternalPackages: ["@neondatabase/serverless"],

  // Experimental flags worth considering once stable for our case:
  experimental: {
    // reactCompiler: true,  // enable when team confirms perf gains
  },

  // For Vercel deployment in São Paulo, set region in vercel.json (not here)
};

export default config;
