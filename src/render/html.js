import {
  readFile,
  readdir
} from "node:fs/promises";

import path from "node:path";

import { fileURLToPath } from "node:url";

import {
  escapeHtml,
  safeLinkUrl
} from "./escape.js";

const moduleDir = path.dirname(
  fileURLToPath(import.meta.url)
);

const STYLE_PATH = path.join(
  moduleDir,
  "style.css"
);

const FONT_PATH = path.join(
  moduleDir,
  "fonts",
  "inter-latin-var.woff2"
);

const DATA_DIR = path.resolve(
  moduleDir,
  "..",
  "..",
  "data"
);

// Inter se embebe en el HTML (base64) para que el PDF no dependa
// de las fuentes instaladas en la máquina. Se cachea tras la
// primera lectura.
let fontFaceCss;

async function getFontFaceCss() {
  if (fontFaceCss !== undefined) {
    return fontFaceCss;
  }

  try {
    const buffer = await readFile(FONT_PATH);

    fontFaceCss = `@font-face {
      font-family: "Inter";
      font-style: normal;
      font-weight: 100 900;
      font-display: block;
      src: url("data:font/woff2;base64,${buffer.toString(
        "base64"
      )}") format("woff2");
    }`;
  } catch {
    // Sin la fuente empaquetada se usa la pila del sistema.
    fontFaceCss = "";
  }

  return fontFaceCss;
}

function renderList(items = []) {
  return items
    .map(
      (item) =>
        `<li>${escapeHtml(item)}</li>`
    )
    .join("");
}

// Une solo las fechas que existen: evita guiones huérfanos
// cuando falta el inicio o el fin.
function renderDates(startDate, endDate) {
  const dates = [startDate, endDate]
    .map((value) =>
      String(value ?? "").trim()
    )
    .filter(Boolean);

  if (dates.length === 0) {
    return "";
  }

  return `
    <div class="dates">
      ${dates
      .map((date) => escapeHtml(date))
      .join(" – ")}
    </div>
  `;
}

function renderDescription(description = []) {
  if (
    !Array.isArray(description) ||
    description.length === 0
  ) {
    return "";
  }

  return `
    <ul>
      ${renderList(description)}
    </ul>
  `;
}

function renderContact(cv) {
  const contact = [
    cv.contact.email,
    cv.contact.phone,
    cv.contact.location
  ]
    .map((value) =>
      String(value ?? "").trim()
    )
    .filter(Boolean);

  const links = [];

  const linkedin = safeLinkUrl(
    cv.contact.linkedin
  );

  if (linkedin) {
    links.push(
      `<a href="${escapeHtml(linkedin)}">LinkedIn</a>`
    );
  }

  const github = safeLinkUrl(
    cv.contact.github
  );

  if (github) {
    links.push(
      `<a href="${escapeHtml(github)}">GitHub</a>`
    );
  }

  const portfolio = safeLinkUrl(
    cv.contact.portfolio
  );

  if (portfolio) {
    links.push(
      `<a href="${escapeHtml(portfolio)}">Portfolio</a>`
    );
  }

  return `
    <div class="contact">
      ${contact
      .map(
        (value) =>
          `<span>${escapeHtml(value)}</span>`
      )
      .join("")}
    </div>

    ${links.length > 0
      ? `
          <div class="contact-links">
            ${links.join(" · ")}
          </div>
        `
      : ""
    }
  `;
}

function renderSkills(skills = {}) {
  const sections = [
    ["Lenguajes", skills.languages],
    ["Frameworks", skills.frameworks],
    ["Bases de datos", skills.databases],
    ["Tecnologías", skills.technologies]
  ];

  return sections
    .filter(
      ([, items]) =>
        Array.isArray(items) && items.length > 0
    )
    .map(
      ([label, items]) => `
        <div class="skill-group">
          <strong>${escapeHtml(label)}</strong>
          <span>
            ${items.map(escapeHtml).join(", ")}
          </span>
        </div>
      `
    )
    .join("");
}

function renderExperience(experience) {
  return experience
    .map(
      (item) => `
        <article class="entry">
          <div class="entry-header">
            <div>
              <h3>${escapeHtml(item.position)}</h3>

              <div class="company">
                ${escapeHtml(item.company)}
              </div>
            </div>

            ${item.location
          ? `
                  <div class="location">
                    ${escapeHtml(item.location)}
                  </div>
                `
          : ""
        }
          </div>

          ${renderDates(
        item.startDate,
        item.endDate
      )}

          ${renderDescription(
        item.description
      )}
        </article>
      `
    )
    .join("");
}

function renderProjects(projects) {
  return projects
    .map((project) => {
      const url = safeLinkUrl(project.url);

      const title = url
        ? `<a href="${escapeHtml(url)}">${escapeHtml(
          project.name
        )}</a>`
        : escapeHtml(project.name);

      return `
        <article class="entry">
          <h3>${title}</h3>

          <ul>
            ${renderList(project.description)}
          </ul>
        </article>
      `;
    })
    .join("");
}

function renderEducation(education) {
  return education
    .map(
      (item) => `
        <article class="entry">
          <h3>
            ${escapeHtml(item.title)}
          </h3>

          <div class="company">
            ${escapeHtml(item.institution)}
          </div>

          ${renderDates(
        item.startDate,
        item.endDate
      )}

          ${renderDescription(
        item.description
      )}
        </article>
      `
    )
    .join("");
}

function renderCertificates(certificates) {
  return certificates
    .map(
      (item) => `
        <article class="entry">
          <h3>
            ${escapeHtml(item.title)}
          </h3>

          ${item.institution
          ? `
                <div class="company">
                  ${escapeHtml(
            item.institution
          )}
                </div>
              `
          : ""
        }

          ${renderDates(
        item.issueDate,
        item.endDate
      )}

          ${renderDescription(
        item.description
      )}
        </article>
      `
    )
    .join("");
}

function renderLanguages(languages) {
  return languages
    .map(
      (language) => `
        <div class="language">
          <span>
            ${escapeHtml(
        language.name
      )}
          </span>

          <span>
            ${escapeHtml(
        language.level
      )}
          </span>
        </div>
      `
    )
    .join("");
}

async function getUserImageDataUrl() {
  let files = [];

  try {
    files = await readdir(DATA_DIR);
  } catch {
    // Sin carpeta data/ (o sin permisos) el CV se genera sin foto.
    return "";
  }

  const imageFile =
    files.find((file) => {
      const parsed =
        path.parse(file);

      return (
        parsed.name.toLowerCase() ===
        "imagenusuario" &&
        [
          ".png",
          ".jpg",
          ".jpeg",
          ".webp"
        ].includes(
          parsed.ext.toLowerCase()
        )
      );
    });

  if (!imageFile) {
    return "";
  }

  const filePath =
    path.join(
      DATA_DIR,
      imageFile
    );

  const buffer =
    await readFile(filePath);

  const extension =
    path.extname(imageFile).toLowerCase();

  const mimeTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  };

  const mimeType =
    mimeTypes[extension];

  if (!mimeType) {
    return "";
  }

  return `data:${mimeType};base64,${buffer.toString(
    "base64"
  )}`;
}

function renderHeader(
  cv,
  imageHtml,
  onePage
) {
  return `
    <header class="${onePage
      ? "header one-page-header"
      : "header"
    }">

      ${imageHtml}

      <div class="header-content">

        <h1>
          ${escapeHtml(cv.name)}
        </h1>

        <div class="title">
          ${escapeHtml(cv.title)}
        </div>

        ${renderContact(cv)}

      </div>

    </header>
  `;
}

function renderAbout(cv) {
  const blocks = String(cv.about ?? "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return "";
  }

  const paragraphs = blocks
    .map(
      (block) => `
        <p class="about">
          ${escapeHtml(block).replaceAll("\n", "<br>")}
        </p>
      `
    )
    .join("");

  return `
    <section>
      <h2>Perfil</h2>

      ${paragraphs}
    </section>
  `;
}

function renderSkillsSection(cv) {
  const skillsHtml = renderSkills(cv.skills);

  if (!skillsHtml) {
    return "";
  }

  return `
    <section>
      <h2>Habilidades</h2>

      ${skillsHtml}
    </section>
  `;
}

function renderExperienceSection(cv) {
  if (!cv.experience.length) {
    return "";
  }

  return `
    <section>
      <h2>Experiencia</h2>

      ${renderExperience(
    cv.experience
  )}
    </section>
  `;
}

function renderProjectsSection(cv) {
  if (!cv.projects.length) {
    return "";
  }

  return `
    <section>
      <h2>Proyectos</h2>

      ${renderProjects(
    cv.projects
  )}
    </section>
  `;
}

function renderEducationSection(cv) {
  if (!cv.education.length) {
    return "";
  }

  return `
    <section>
      <h2>Educación</h2>

      ${renderEducation(
    cv.education
  )}
    </section>
  `;
}

function renderCertificatesSection(cv) {
  if (
    !cv.certificates ||
    !cv.certificates.length
  ) {
    return "";
  }

  return `
    <section>
      <h2>Certificaciones</h2>

      ${renderCertificates(
    cv.certificates
  )}
    </section>
  `;
}

function renderLanguagesSection(cv) {
  if (!cv.languages.length) {
    return "";
  }

  return `
    <section>
      <h2>Idiomas</h2>

      ${renderLanguages(
    cv.languages
  )}
    </section>
  `;
}

function renderStandardLayout(
  cv,
  imageHtml
) {
  return `
    <main class="page">
      <div class="page-content">

        ${renderHeader(
    cv,
    imageHtml,
    false
  )}

        ${renderAbout(cv)}

        ${renderSkillsSection(
    cv
  )}

        ${renderExperienceSection(
    cv
  )}

        ${renderProjectsSection(
    cv
  )}

        ${renderEducationSection(
    cv
  )}

        ${renderCertificatesSection(
    cv
  )}

        ${renderLanguagesSection(
    cv
  )}

      </div>
    </main>
  `;
}

function renderOnePageLayout(
  cv,
  imageHtml
) {
  return `
    <main class="page one-page">
      <div class="page-content">

        ${renderHeader(
    cv,
    imageHtml,
    true
  )}

        <div class="one-page-columns">

          <aside class="one-page-sidebar">

            ${renderAbout(cv)}

            ${renderSkillsSection(
    cv
  )}

            ${renderEducationSection(
    cv
  )}

            ${renderCertificatesSection(
    cv
  )}

            ${renderLanguagesSection(
    cv
  )}

          </aside>

          <div class="one-page-main">

            ${renderExperienceSection(
    cv
  )}

            ${renderProjectsSection(
    cv
  )}

          </div>

        </div>

      </div>
    </main>
  `;
}

export async function renderHtml(
  cv,
  { layout = "standard" } = {}
) {
  const [css, fontFace] = await Promise.all([
    readFile(
      STYLE_PATH,
      "utf-8"
    ),
    getFontFaceCss()
  ]);

  const userImage =
    await getUserImageDataUrl();

  const imageHtml =
    userImage
      ? `
        <div class="cv-photo">
          <img
            src="${userImage}"
            alt="Foto de ${escapeHtml(
        cv.name
      )}"
          />
        </div>
      `
      : "";

  const body =
    layout === "one-page"
      ? renderOnePageLayout(
        cv,
        imageHtml
      )
      : renderStandardLayout(
        cv,
        imageHtml
      );

  return `<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <meta
    name="color-scheme"
    content="light"
  >

  <meta
    name="author"
    content="${escapeHtml(cv.name)}"
  >

  <title>
    ${escapeHtml(cv.name)} - CV
  </title>

  <style>
    ${fontFace}
    ${css}
  </style>
</head>

<body>

  ${body}

</body>

</html>`;
}