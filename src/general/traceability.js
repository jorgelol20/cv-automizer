function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

// El kit general es texto libre (carta/email),
// no listas cerradas como las skills del CV.
// No se puede filtrar por tokens sin romper
// la redacción, así que la trazabilidad aquí es:
// 1. Normalizar (trim, sin vacíos).
// 2. No inventar identidad: el nombre y el
// contacto que se renderizan vienen siempre
// de SOURCE (parseUserInfo), nunca de la IA.
// Ver renderLetterMarkdown/renderEmailHtml.
export function enforceGeneralTraceability(kit, source) {
  kit.letter = normalizeText(kit.letter);
  kit.emailSubject = normalizeText(kit.emailSubject);
  kit.emailBody = normalizeText(kit.emailBody);

  if (!Array.isArray(kit.keyPoints)) {
    kit.keyPoints = [];
  } else {
    kit.keyPoints = kit.keyPoints
      .map((point) => normalizeText(point))
      .filter(Boolean);
  }

  // Corrección canónica: la identidad que se
  // muestra en cabecera/firma es la de SOURCE.
  // Si hay override por entorno, se aplica al
  // SOURCE antes de renderizar (ver generate.js).
  if (!source || typeof source !== "object") {
    return kit;
  }

  return kit;
}
