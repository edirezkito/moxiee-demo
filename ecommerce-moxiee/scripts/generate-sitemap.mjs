// scripts/generate-sitemap.mjs
//
// Generates public/sitemap.xml with every static page PLUS every active
// product and category currently in the database — run this before each
// deploy (or on a schedule/CI job) so search engines can discover new
// products automatically.
//
// Usage:
//   SITE_URL=https://your-store-domain.com \
//   VITE_SUPABASE_URL=https://your-project-ref.supabase.co \
//   VITE_SUPABASE_ANON_KEY=your-anon-key \
//   node scripts/generate-sitemap.mjs

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const SITE_URL = (process.env.SITE_URL ?? "https://your-store-domain.com").replace(/\/$/, "");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars. " +
      "Run this with the same values from your .env file."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const staticUrls = [
  { loc: "/", priority: "1.0" },
  { loc: "/shop", priority: "0.9" },
  { loc: "/privacy-policy", priority: "0.3" },
  { loc: "/terms-of-service", priority: "0.3" },
  { loc: "/refund-policy", priority: "0.3" },
];

async function main() {
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("is_active", true);
  if (productsError) throw productsError;

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("slug");
  if (categoriesError) throw categoriesError;

  const urls = [
    ...staticUrls,
    ...(categories ?? []).map((c) => ({ loc: `/shop?category=${c.slug}`, priority: "0.6" })),
    ...(products ?? []).map((p) => ({
      loc: `/product/${p.slug}`,
      priority: "0.8",
      lastmod: p.updated_at?.slice(0, 10),
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${SITE_URL}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`
  )
  .join("\n")}
</urlset>
`;

  writeFileSync(new URL("../public/sitemap.xml", import.meta.url), xml);
  console.log(`✓ Wrote public/sitemap.xml with ${urls.length} URLs.`);
}

main().catch((err) => {
  console.error("Failed to generate sitemap:", err);
  process.exit(1);
});
