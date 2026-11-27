export function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Solo se permiten enlaces web y mailto. Evita javascript:,
// data:, file: y cualquier otro esquema ejecutable.
export function safeLinkUrl(value = "") {
  const url = String(value ?? "").trim();

  if (!url) {
    return "";
  }

  if (/^(https?:\/\/|mailto:)/i.test(url)) {
    return url;
  }

  return "";
}
