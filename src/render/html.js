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
    .map(
      (item) =>
        `<li>${escapeHtml(item)}</li>`
    )
    .join("");
}

function renderContact(cv) {
  const contact = [
    cv.contact.email,
    cv.contact.phone,
    cv.contact.location
  ].filter(Boolean);

  const links = [];

  if (cv.contact.linkedin) {
    links.push(
      `<a href="${escapeHtml(
        cv.contact.linkedin
      )}">LinkedIn</a>`
    );
  }

  if (cv.contact.github) {
    links.push(
      `<a href="${escapeHtml(
        cv.contact.github
      )}">GitHub</a>`
    );
  }

  if (cv.contact.portfolio) {
    links.push(
      `<a href="${escapeHtml(
        cv.contact.portfolio
      )}">Portfolio</a>`
    );
  }

  return `
    <div class="contact">
      ${contact.map(escapeHtml).join(" · ")}
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

          ${item.startDate || item.endDate
          ? `
                <div class="dates">
                  ${escapeHtml(item.startDate)}
                  ${item.startDate ||
            item.endDate
            ? " – "
            : ""
          }
                  ${escapeHtml(item.endDate)}
                </div>
              `
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
          ? `
                  <a href="${escapeHtml(
            project.url
          )}">
                    ${escapeHtml(
            project.name
          )}
                  </a>
                `
          : escapeHtml(
            project.name
          )
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
          <h3>
            ${escapeHtml(item.title)}
          </h3>

          <div class="company">
            ${escapeHtml(item.institution)}
          </div>

          ${item.startDate || item.endDate
          ? `
                <div class="dates">
                  ${escapeHtml(item.startDate)}
                  ${item.startDate ||
            item.endDate
            ? " – "
            : ""
          }
                  ${escapeHtml(item.endDate)}
                </div>
              `
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

          ${item.issueDate || item.endDate
          ? `
                <div class="dates">
                  ${escapeHtml(item.issueDate)}
                  ${item.issueDate ||
            item.endDate
            ? " – "
            : ""
          }
                  ${escapeHtml(item.endDate)}
                </div>
              `
          : ""
        }

          ${item.description?.length > 0
          ? `
                <ul>
                  ${renderList(
            item.description
          )}
                </ul>
              `
          : ""
        }
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
  const dataDir = "data";

  const files =
    await readdir(dataDir);

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
      dataDir,
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
  if (!cv.about) {
    return "";
  }

  return `
    <section>
      <h2>Perfil</h2>

      <p class="about">
        ${escapeHtml(cv.about)}
      </p>
    </section>
  `;
}

function renderSkillsSection(cv) {
  return `
    <section>
      <h2>Habilidades</h2>

      ${renderSkills(cv.skills)}
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
  const css =
    await readFile(
      "src/render/style.css",
      "utf-8"
    );

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

  <title>
    ${escapeHtml(cv.name)} - CV
  </title>

  <style>
    ${css}
  </style>
</head>

<body>

  ${body}

</body>

</html>`;
}