import type { MetadataRoute } from "next";
import { SITE_URL } from "./legal";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/decouvrir/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/mentions-legales/`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/confidentialite/`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
