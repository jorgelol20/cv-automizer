function normalize(value) {
  return String(value)
    .trim()
    .toLowerCase();
}

function normalizeEmpty(value) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}

function extractExplicitSkills(userInfo) {
  const skills = new Set();

  const sections = [
    "Lenguajes",
    "Frameworks",
    "Bases de datos",
    "Tecnologías / Herramientas"
  ];

  for (const section of sections) {
    const regex = new RegExp(
      `^\\*\\*${section}:\\*\\*\\s*(.+)$`,
      "im"
    );

    const match = userInfo.match(regex);

    if (!match) {
      continue;
    }

    const values = match[1]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    for (const value of values) {
      skills.add(normalize(value));
    }
  }

  return skills;
}

function filterExplicitSkills(items, explicitSkills) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item) =>
    explicitSkills.has(normalize(item))
  );
}

function hasExplicitHumanLanguages(userInfo) {
  return [
    /^##\s+Idiomas\b/im,
    /^\*\*Idiomas:\*\*/im,
    /^\*\*Lenguas:\*\*/im
  ].some((pattern) =>
    pattern.test(userInfo)
  );
}

export function enforceTraceability(cv, userInfo) {
  const explicitSkills =
    extractExplicitSkills(userInfo);

  /*
   * Las skills deben existir explícitamente
   * en USER_INFO.
   */
  cv.skills.languages =
    filterExplicitSkills(
      cv.skills.languages,
      explicitSkills
    );

  cv.skills.frameworks =
    filterExplicitSkills(
      cv.skills.frameworks,
      explicitSkills
    );

  cv.skills.databases =
    filterExplicitSkills(
      cv.skills.databases,
      explicitSkills
    );

  cv.skills.technologies =
    filterExplicitSkills(
      cv.skills.technologies,
      explicitSkills
    );

  /*
   * Las fechas desconocidas deben ser
   * cadenas vacías y no espacios.
   */
  for (const item of cv.experience) {
    item.startDate =
      normalizeEmpty(item.startDate);

    item.endDate =
      normalizeEmpty(item.endDate);
  }

  for (const item of cv.education) {
    item.startDate =
      normalizeEmpty(item.startDate);

    item.endDate =
      normalizeEmpty(item.endDate);
  }

  /*
   * Los idiomas humanos tienen una regla
   * determinista independiente del modelo.
   */
  if (!hasExplicitHumanLanguages(userInfo)) {
    cv.languages = [];
  }

  return cv;
}