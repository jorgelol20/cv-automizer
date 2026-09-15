import {
  readFile,
  readdir
} from "node:fs/promises";
import path from "node:path";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderList(items = []) {
  return items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function renderSkills(skills) {
  const sections = [
    ["Lenguajes", skills.languages],
    ["Frameworks", skills.frameworks],
    ["Bases de datos", skills.databases],
    ["Tecnologías", skills.technologies]
  ];

  return sections
    .filter(([, items]) => items.length > 0)
    .map(
      ([label, items]) => `
        <div class="skill-group">
          <strong>${escapeHtml(label)}</strong>
          <span>${items.map(escapeHtml).join(", ")}</span>
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
              <div class="company">${escapeHtml(item.company)}</div>
            </div>

            ${item.location
          ? `<div class="location">${escapeHtml(item.location)}</div>`
          : ""
        }
          </div>

          ${item.startDate || item.endDate
          ? `<div class="dates">
                  ${escapeHtml(item.startDate)}
                  ${item.startDate || item.endDate ? " – " : ""}
                  ${escapeHtml(item.endDate)}
                </div>`
          : ""
        }

          <ul>
            ${renderList(item.description)}
          </ul>
        </article>
      `
    )
    .join("");
}

function renderProjects(projects) {
  return projects
    .map(
      (project) => `
        <article class="entry">
          <h3>
            ${project.url
          ? `<a href="${escapeHtml(project.url)}">${escapeHtml(
            project.name
          )}</a>`
          : escapeHtml(project.name)
        }
          </h3>

          <ul>
            ${renderList(project.description)}
          </ul>
        </article>
      `
    )
    .join("");
}

function renderEducation(education) {
  return education
    .map(
      (item) => `
        <article class="entry">
          <h3>${escapeHtml(item.title)}</h3>
          <div class="company">${escapeHtml(item.institution)}</div>

          ${item.startDate || item.endDate
          ? `<div class="dates">
                  ${escapeHtml(item.startDate)}
                  ${item.startDate || item.endDate ? " – " : ""}
                  ${escapeHtml(item.endDate)}
                </div>`
          : ""
        }

          <ul>
            ${renderList(item.description)}
          </ul>
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
          <span>${escapeHtml(language.name)}</span>
          <span>${escapeHtml(language.level)}</span>
        </div>
      `
    )
    .join("");
}

async function getUserImageDataUrl() {
  const dataDir = "data";

  const files = await readdir(dataDir);

  const imageFile = files.find((file) => {
    const parsed = path.parse(file);

    return (
      parsed.name.toLowerCase() === "imagenusuario" &&
      [".png", ".jpg", ".jpeg", ".webp"].includes(
        parsed.ext.toLowerCase()
      )
    );
  });

  if (!imageFile) {
    return "";
  }

  const filePath = path.join(dataDir, imageFile);
  const buffer = await readFile(filePath);

  const extension = path
    .extname(imageFile)
    .toLowerCase();

  const mimeTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  };

  const mimeType = mimeTypes[extension];

  if (!mimeType) {
    return "";
  }

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function renderHtml(cv) {
  const css = await readFile(
    "src/render/style.css",
    "utf-8"
  );

  const userImage = await getUserImageDataUrl();
  const imageHtml = userImage
    ? `
    <div class="cv-photo">
      <img
        src="${userImage}"
        alt="Foto de ${cv.name}"
      />
    </div>
  `
    : "";
  const contact = [
    cv.contact.email,
    cv.contact.phone,
    cv.contact.location
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${escapeHtml(cv.name)} - CV</title>

  <style>
    ${css}
  </style>
</head>

<body>
  <main class="page">

    <header class="header">
      ${imageHtml}
      <div class="header-content">
        <h1>${escapeHtml(cv.name)}</h1>
        <div class="title">${escapeHtml(cv.title)}</div>
        <div class="contact">
          ${contact.map(escapeHtml).join(" · ")}
        </div>
      </div>
    </header>

    ${cv.about
      ? `
          <section>
            <h2>Perfil</h2>
            <p class="about">${escapeHtml(cv.about)}</p>
          </section>
        `
      : ""
    }

    <section>
      <h2>Habilidades</h2>
      ${renderSkills(cv.skills)}
    </section>

    ${cv.experience.length > 0
      ? `
          <section>
            <h2>Experiencia</h2>
            ${renderExperience(cv.experience)}
          </section>
        `
      : ""
    }

    ${cv.projects.length > 0
      ? `
          <section>
            <h2>Proyectos</h2>
            ${renderProjects(cv.projects)}
          </section>
        `
      : ""
    }

    ${cv.education.length > 0
      ? `
          <section>
            <h2>Educación</h2>
            ${renderEducation(cv.education)}
          </section>
        `
      : ""
    }

    ${cv.languages.length > 0
      ? `
          <section>
            <h2>Idiomas</h2>
            ${renderLanguages(cv.languages)}
          </section>
        `
      : ""
    }

  </main>
</body>
</html>`;
}