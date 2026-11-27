import {
  escapeHtml,
  safeLinkUrl
} from "../render/escape.js";

function formatInline(text) {
  return text
    .replace(
      /\*\*(.+?)\*\*/g,
      "<strong>$1</strong>"
    )
    .replace(
      /(^|[^*])\*(?!\s)([^*]+?)(?<!\s)\*/g,
      "$1<em>$2</em>"
    );
}

// Conversión mínima de Markdown a HTML para la carta.
// El texto se escapa primero: nunca se inyecta HTML del modelo.
function formatLetterBody(markdown) {
  const blocks = String(markdown ?? "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const first = lines[0];

      const heading = first.match(/^(#{1,3})\s+(.+)$/);

      if (heading) {
        const level = heading[1].length;
        const content = formatInline(
          escapeHtml(heading[2])
        );

        const rest = lines
          .slice(1)
          .join("\n")
          .trim();

        const restHtml = rest
          ? `<p>${formatInline(
            escapeHtml(rest)
          ).replaceAll("\n", "<br>")}</p>`
          : "";

        return `<h${level}>${content}</h${level}>${restHtml}`;
      }

      if (
        lines.every((line) =>
          /^\s*[-*]\s+/.test(line)
        )
      ) {
        const items = lines
          .map(
            (line) =>
              `<li>${formatInline(
                escapeHtml(
                  line.replace(
                    /^\s*[-*]\s+/,
                    ""
                  )
                )
              )}</li>`
          )
          .join("");

        return `<ul>${items}</ul>`;
      }

      return `<p>${formatInline(
        escapeHtml(block)
      ).replaceAll("\n", "<br>")}</p>`;
    })
    .join("\n");
}

function renderContactLine(source) {
  const contact = source.contact || {};

  return [
    contact.email,
    contact.phone,
    contact.location
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
}

function renderLinks(source) {
  const contact = source.contact || {};

  const links = [
    ["LinkedIn", contact.linkedin],
    ["GitHub", contact.github],
    ["Portfolio", contact.portfolio]
  ]
    .map(([label, value]) => {
      const url = safeLinkUrl(value);

      return url
        ? `<a href="${escapeHtml(url)}">${label}</a>`
        : "";
    })
    .filter(Boolean);

  return links.length
    ? `<p class="links">${links.join(" · ")}</p>`
    : "";
}

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

export function renderLetterHtml(kit, source) {
  const today = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const name = escapeHtml(source.name || "");
  const title = escapeHtml(source.title || "");
  const contactLine = renderContactLine(source);
  const links = renderLinks(source);

  const body = formatLetterBody(kit.letter || "");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Carta de presentación - ${name}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: #222;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 11.5pt;
      line-height: 1.6;
      orphans: 3;
      widows: 3;
    }

    header {
      border-bottom: 2px solid #222;
      margin-bottom: 22px;
      padding-bottom: 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    h1 {
      font-size: 21pt;
      letter-spacing: 0.4px;
      margin: 0 0 4px;
      break-after: avoid;
      page-break-after: avoid;
    }

    .title {
      color: #555;
      font-size: 11pt;
      letter-spacing: 0.8px;
      margin: 0 0 6px;
      text-transform: uppercase;
    }

    .contact,
    .links {
      color: #444;
      font-size: 9.5pt;
      margin: 3px 0;
    }

    a {
      color: #1a4f8a;
      text-decoration: none;
      overflow-wrap: anywhere;
    }

    .date {
      color: #555;
      font-size: 10pt;
      margin: 0 0 18px;
      text-align: right;
    }

    .letter p {
      margin: 0 0 10px;
      text-align: justify;
      hyphens: auto;
      orphans: 3;
      widows: 3;
    }

    .letter h1,
    .letter h2,
    .letter h3 {
      font-size: 12.5pt;
      margin: 14px 0 8px;
    }

    .letter ul {
      margin: 0 0 10px 18px;
      padding: 0;
    }

    .letter li {
      margin-bottom: 4px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    footer {
      margin-top: 26px;
      padding-top: 12px;
      border-top: 1px solid #ccc;
      font-size: 10.5pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    footer p {
      margin: 3px 0;
    }

    .signature {
      font-weight: bold;
      margin-top: 8px !important;
    }
  </style>
</head>
<body>
  <header>
    <h1>${name}</h1>
    ${source.title ? `<p class="title">${title}</p>` : ""}
    ${contactLine ? `<p class="contact">${contactLine}</p>` : ""}
    ${links}
  </header>

  <p class="date">${today}</p>

  <main class="letter">
    ${body}
  </main>

  <footer>
    <p>Atentamente,</p>
    <p class="signature">${name}</p>
    ${contactLine ? `<p class="contact">${contactLine}</p>` : ""}
  </footer>
</body>
</html>`;
}
