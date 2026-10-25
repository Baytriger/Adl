import type { MetadataRoute } from "next";

const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Public, indexable pages only. The /app workspace and API routes are intentionally absent.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${origin}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${origin}/sign-in`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
