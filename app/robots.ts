import type { MetadataRoute } from "next";
import { SITE_URL } from "./legal";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/foot/sitemap.xml`],
  };
}
