export function renderMarkdown(cv) {
  const lines = [];

  lines.push(`# ${cv.name}`);
  lines.push(`## ${cv.title}`);
  lines.push("");

  if (cv.contact.email || cv.contact.phone || cv.contact.location) {
    const contact = [
      cv.contact.email,
      cv.contact.phone,
      cv.contact.location
    ].filter(Boolean);

    lines.push(contact.join(" · "));
    lines.push("");
  }

  if (cv.about) {
    lines.push("## Perfil");
    lines.push("");
    lines.push(cv.about);
    lines.push("");
  }

  lines.push("## Habilidades");
  lines.push("");

  if (cv.skills.languages.length > 0) {
    lines.push(`**Lenguajes:** ${cv.skills.languages.join(", ")}`);
  }

  if (cv.skills.frameworks.length > 0) {
    lines.push(`**Frameworks:** ${cv.skills.frameworks.join(", ")}`);
  }

  if (cv.skills.databases.length > 0) {
    lines.push(`**Bases de datos:** ${cv.skills.databases.join(", ")}`);
  }

  if (cv.skills.technologies.length > 0) {
    lines.push(`**Tecnologías:** ${cv.skills.technologies.join(", ")}`);
  }

  lines.push("");

  if (cv.experience.length > 0) {
    lines.push("## Experiencia");
    lines.push("");

    for (const experience of cv.experience) {
      lines.push(
        `### ${experience.position} — ${experience.company}`
      );

      if (experience.location) {
        lines.push(`*${experience.location}*`);
      }

      lines.push("");

      for (const description of experience.description) {
        lines.push(`- ${description}`);
      }

      lines.push("");
    }
  }

  if (cv.projects.length > 0) {
    lines.push("## Proyectos");
    lines.push("");

    for (const project of cv.projects) {
      const title = project.url
        ? `[${project.name}](${project.url})`
        : project.name;

      lines.push(`### ${title}`);
      lines.push("");

      for (const description of project.description) {
        lines.push(`- ${description}`);
      }

      lines.push("");
    }
  }

  if (cv.education.length > 0) {
    lines.push("## Educación");
    lines.push("");

    for (const education of cv.education) {
      lines.push(`### ${education.title}`);
      lines.push(`*${education.institution}*`);

      if (education.startDate || education.endDate) {
        lines.push(
          `${education.startDate} – ${education.endDate}`
        );
      }

      lines.push("");

      for (const description of education.description) {
        lines.push(`- ${description}`);
      }

      lines.push("");
    }
  }

  if (cv.languages.length > 0) {
    lines.push("## Idiomas");
    lines.push("");

    for (const language of cv.languages) {
      lines.push(`- ${language.name}: ${language.level}`);
    }

    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}