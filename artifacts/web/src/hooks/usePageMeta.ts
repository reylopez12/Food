import { useEffect } from "react";

const SITE_NAME = "Eat. Local. Food.";
const DEFAULT_DESCRIPTION =
  "Eat. Local. Food. helps you discover independent Bay Area restaurants, food trucks, and neighborhood gems.";

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

/** Set the document title and description for the current page. */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Independent Bay Area food`;
    const desc = description?.slice(0, 160) ?? DEFAULT_DESCRIPTION;
    document.title = fullTitle;
    setMeta('meta[name="description"]', "name", "description", desc);
    setMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", desc);
  }, [title, description]);
}
