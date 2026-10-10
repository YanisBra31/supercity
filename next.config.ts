import type { NextConfig } from "next";

// Export statique : `npm run build` produit le dossier `out/`, à déposer tel quel sur l'hébergement.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
