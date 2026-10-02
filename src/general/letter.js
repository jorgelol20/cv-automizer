export function renderLetterMarkdown(kit, source) {
  const today = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const contact = source.contact || {};

  const header = [
    `# Carta de Presentación`,
    ``,
    `**${source.name || ""}**`,
    source.title ? `*${source.title}*` : "",
    ``,
    contact.email || "",
    contact.phone ? ` | ${contact.phone}` : "",
    contact.location ? ` | ${contact.location}` : "",
    ``,
    `Fecha: ${today}`,
    ``
  ].filter(Boolean).join("\n");

  const letter = kit.letter || "";

  const signature = [
    ``,
    `---`,
    ``,
    `Atentamente,`,
    ``,
    `**${source.name || ""}**`,
    contact.email || "",
    contact.phone || "",
    contact.linkedin || "",
    contact.github || ""
  ].filter(Boolean).join("\n");

  return `${header}\n${letter}\n${signature}`;
}
