import type { MetadataRoute } from "next";

const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// robots.txt is a courtesy to crawlers, not access control. The workspace is protected by sign-in.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/api"] }],
    sitemap: `${origin}/sitemap.xml`,
  };
}
