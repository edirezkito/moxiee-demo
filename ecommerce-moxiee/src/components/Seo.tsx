import { useEffect } from "react";

interface SeoProps {
  title: string;
  description: string;
  image?: string;
  /** Optional schema.org JSON-LD object (e.g. Product, BreadcrumbList). */
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = "Moxiee";
const JSONLD_ELEMENT_ID = "seo-jsonld";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Sets document.title, meta description, and Open Graph/Twitter tags for
 * the current page, and restores the site defaults on unmount. No extra
 * dependency (like react-helmet) needed — this direct DOM approach is
 * enough for a single-page storefront.
 *
 * Usage: <Seo title="Shop" description="Browse all products at Moxiee." />
 */
export function Seo({ title, description, image, jsonLd }: SeoProps) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    setMeta("name", "description", description);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", window.location.href);
    if (image) {
      setMeta("property", "og:image", image);
      setMeta("name", "twitter:image", image);
    }
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);

    let jsonLdEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdEl = document.createElement("script");
      jsonLdEl.type = "application/ld+json";
      jsonLdEl.id = JSONLD_ELEMENT_ID;
      jsonLdEl.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdEl);
    }

    return () => {
      if (jsonLdEl) jsonLdEl.remove();
    };
  }, [title, description, image, jsonLd]);

  return null;
}
