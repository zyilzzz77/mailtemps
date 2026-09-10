import DOMPurify from "dompurify";

if (typeof window !== "undefined") {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
    const style = node.getAttribute("style");
    if (style) {
      const cleaned = style
        .split(";")
        .map((declaration) => declaration.trim())
        .filter((declaration) => declaration && !/url\s*\(|@import|expression\s*\(/i.test(declaration))
        .join("; ");
      if (cleaned) node.setAttribute("style", cleaned);
      else node.removeAttribute("style");
    }
  });
}

export function sanitizeEmailHtml(html: string): string {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      "img", "iframe", "object", "embed", "video", "audio",
      "form", "input", "textarea", "select", "option",
      "svg", "math", "link", "meta", "base", "style", "picture", "source",
    ],
    FORBID_ATTR: ["srcset", "poster", "action", "formaction", "xlink:href"],
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}
