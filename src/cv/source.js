function normalize(value) {
    return String(value ?? "").trim();
}

function parseCommaSeparated(value) {
    const result = [];
    let current = "";
    let depth = 0;

    for (const char of String(value ?? "")) {
        if (char === "(") {
            depth++;
            current += char;
            continue;
        }

        if (char === ")") {
            depth = Math.max(0, depth - 1);
            current += char;
            continue;
        }

        if (char === "," && depth === 0) {
            const item = normalize(current);

            if (item) {
                result.push(item);
            }

            current = "";
            continue;
        }

        current += char;
    }

    const lastItem = normalize(current);

    if (lastItem) {
        result.push(lastItem);
    }

    return result;
}

function getLabeledValue(line, label) {
    const regex = new RegExp(
        `^\\*\\*${label}:\\*\\*\\s*(.*)$`
    );

    const match = line.match(regex);

    return match
        ? normalize(match[1])
        : "";
}

function findSectionBounds(lines, title) {
    const start = lines.findIndex(
        (line) =>
            normalize(line) === `## ${title}`
    );

    if (start === -1) {
        return null;
    }

    let end = lines.length;

    for (
        let i = start + 1;
        i < lines.length;
        i++
    ) {
        if (/^##\s+/.test(lines[i])) {
            end = i;
            break;
        }
    }

    return {
        start: start + 1,
        end
    };
}

function parseMarkdownBlocks(lines) {
    const blocks = [];
    let current = null;

    for (const rawLine of lines) {
        const line = String(rawLine);

        const headingMatch =
            line.match(/^###\s+(.+?)\s*$/);

        if (headingMatch) {
            if (current) {
                blocks.push(current);
            }

            current = {
                heading: normalize(
                    headingMatch[1]
                ),
                lines: []
            };

            continue;
        }

        if (current) {
            current.lines.push(line);
        }
    }

    if (current) {
        blocks.push(current);
    }

    return blocks;
}

function getBlockValue(block, label) {
    for (const line of block.lines) {
        const value =
            getLabeledValue(
                line,
                label
            );

        if (value) {
            return value;
        }

        const emptyMatch = line.match(
            new RegExp(
                `^\\*\\*${label}:\\*\\*\\s*$`
            )
        );

        if (emptyMatch) {
            return "";
        }
    }

    return "";
}

function parseSkills(lines) {
    const skills = {
        languages: [],
        frameworks: [],
        databases: [],
        technologies: []
    };

    const mappings = {
        Lenguajes: "languages",
        Frameworks: "frameworks",
        "Bases de datos": "databases",
        "Tecnologías / Herramientas":
            "technologies"
    };

    for (const line of lines) {
        const match = line.match(
            /^\*\*(.+?):\*\*\s*(.*)$/
        );

        if (!match) {
            continue;
        }

        const label = normalize(match[1]);
        const key = mappings[label];

        if (!key) {
            continue;
        }

        skills[key] =
            parseCommaSeparated(match[2]);
    }

    return skills;
}

function parseBulletLines(lines) {
    return lines
        .map((line) => normalize(line))
        .map((line) => {
            return line.replace(/^\\(?=[-•*]\s)/, "");
        })
        .filter((line) =>
            /^[-•*]\s+/.test(line)
        )
        .map((line) =>
            normalize(
                line.replace(
                    /^[-•*]\s+/,
                    ""
                )
            )
        )
        .filter(Boolean);
}

function parseExperience(lines) {
    const blocks =
        parseMarkdownBlocks(lines);
    return blocks.map((block) => ({
        position: getBlockValue(
            block,
            "Puesto"
        ),
        company: block.heading,
        location: getBlockValue(
            block,
            "Ubicación"
        ),
        startDate: getBlockValue(
            block,
            "Inicio"
        ),
        endDate: getBlockValue(
            block,
            "Fin"
        ),
        description:
            parseBulletLines(block.lines)
    }));
}

function parseProjects(lines) {
    const blocks =
        parseMarkdownBlocks(lines);

    return blocks.map((block) => ({
        name: block.heading,
        url: getBlockValue(
            block,
            "URL"
        ),
        description:
            parseBulletLines(block.lines)
    }));
}

function parseEducation(lines) {
    const blocks =
        parseMarkdownBlocks(lines);

    return blocks.map((block) => ({
        title: block.heading,
        startDate: getBlockValue(
            block,
            "Inicio"
        ),
        endDate: getBlockValue(
            block,
            "Fin"
        ),
        institution: getBlockValue(
            block,
            "Institución"
        ),
        description:
            parseBulletLines(block.lines)
    }));
}

function parseContact(lines) {
    const contact = {
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        github: ""
    };

    const section =
        findSectionBounds(
            lines,
            "Contacto"
        );

    if (!section) {
        return contact;
    }

    const sectionLines =
        lines.slice(
            section.start,
            section.end
        );

    for (const line of sectionLines) {
        const email =
            getLabeledValue(
                line,
                "Email"
            );

        const phone =
            getLabeledValue(
                line,
                "Teléfono"
            );

        const location =
            getLabeledValue(
                line,
                "Ubicación"
            );

        const linkedin =
            getLabeledValue(
                line,
                "LinkedIn"
            );

        const github =
            getLabeledValue(
                line,
                "GitHub"
            );

        if (email) {
            contact.email =
                email.replace(
                    /^\[([^\]]+)\]\([^)]+\)$/,
                    "$1"
                );
        }

        if (phone) {
            contact.phone = phone;
        }

        if (location) {
            contact.location = location;
        }

        if (linkedin) {
            contact.linkedin = linkedin;
        }

        if (github) {
            contact.github = github;
        }
    }

    return contact;
}

function parseTitle(lines) {
    const section =
        findSectionBounds(
            lines,
            "Información profesional"
        );

    if (!section) {
        return "";
    }

    const sectionLines =
        lines.slice(
            section.start,
            section.end
        );

    for (const line of sectionLines) {
        const title =
            getLabeledValue(
                line,
                "Título"
            );

        if (title) {
            return title;
        }
    }

    return "";
}

export function parseUserInfo(userInfo) {
    const lines =
        userInfo.split(/\r?\n/);

    const nameLine = lines.find(
        (line) =>
            /^#\s+/.test(line)
    );

    const name = nameLine
        ? normalize(
            nameLine.replace(
                /^#\s+/,
                ""
            )
        )
        : "";

    const title =
        parseTitle(lines);

    const skills =
        parseSkills(lines);

    const experienceSection =
        findSectionBounds(
            lines,
            "Experiencia"
        );

    const projectsSection =
        findSectionBounds(
            lines,
            "Proyectos"
        );

    const educationSection =
        findSectionBounds(
            lines,
            "Educación"
        );

    const experience =
        experienceSection
            ? parseExperience(
                lines.slice(
                    experienceSection.start,
                    experienceSection.end
                )
            )
            : [];

    const projects =
        projectsSection
            ? parseProjects(
                lines.slice(
                    projectsSection.start,
                    projectsSection.end
                )
            )
            : [];

    const education =
        educationSection
            ? parseEducation(
                lines.slice(
                    educationSection.start,
                    educationSection.end
                )
            )
            : [];

    const contact =
        parseContact(lines);

    const source = {
        name,
        title,
        skills,
        experience,
        projects,
        education,
        languages: [],
        contact
    };

    source.experience = source.experience.map(
        (item, index) => ({
            id: `experience-${index + 1}`,
            ...item
        })
    );

    source.projects = source.projects.map(
        (item, index) => ({
            id: `project-${index + 1}`,
            ...item
        })
    );

    source.education = source.education.map(
        (item, index) => ({
            id: `education-${index + 1}`,
            ...item
        })
    );

    return source;
}