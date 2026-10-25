import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/login", "/register"],
      disallow: ["/api/", "/overview", "/connections", "/shortlist", "/messages", "/tracker", "/settings"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
