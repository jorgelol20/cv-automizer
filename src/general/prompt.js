import { readFile } from "node:fs/promises";

function renderPrompt(template, variables) {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (match, key) => {
      if (!(key in variables)) {
        throw new Error(
          `Variable "${key}" no está definida`
        );
      }

      return variables[key];
    }
  );
}

export async function buildGeneralPrompt({
  userInfo,
  companyName,
  companyType,
  tone,
  letterLength,
  schema
}) {
  const systemTemplate = await readFile(
    "ia/general-system.md",
    "utf-8"
  );

  const promptTemplate = await readFile(
    "ia/general-prompt.md",
    "utf-8"
  );

  if (!systemTemplate.trim()) {
    throw new Error(
      "ia/general-system.md está vacío"
    );
  }

  if (!promptTemplate.trim()) {
    throw new Error(
      "ia/general-prompt.md está vacío"
    );
  }

  const toneInstructions = {
    formal: "Tono formal y profesional. Lenguaje culto y respetuoso.",
    enthusiastic: "Tono entusiasta y motivado. Transmitir energía y ganas de aportar.",
    direct: "Tono directo y conciso. Ir al grano, sin rodeos."
  };

  const lengthInstructions = {
    short: "Carta corta: 1 párrafo de 3-4 líneas.",
    medium: "Carta media: 3 párrafos (presentación, propuesta de valor, cierre).",
    long: "Carta larga: 4-5 párrafos con detalle de motivación y encaje."
  };

  const companyTypeInstructions = {
    startup: "Startup: destacar versatilidad, capacidad de aprendizaje rápido, adaptabilidad y mentalidad de crecimiento.",
    consulting: "Consultora: destacar experiencia con clientes, metodologías de trabajo, comunicación y resolución de problemas.",
    enterprise: "Gran empresa: destacar experiencia, certificaciones, capacidad de trabajo en equipo y estabilidad.",
    sector: "Sector específico: destacar conocimientos técnicos relevantes y experiencia en el sector."
  };

  const variables = {
    USER_INFO: userInfo,
    COMPANY_NAME: companyName,
    COMPANY_TYPE: companyType,
    TONE_INSTRUCTION: toneInstructions[tone] || toneInstructions.formal,
    LENGTH_INSTRUCTION: lengthInstructions[letterLength] || lengthInstructions.medium,
    COMPANY_TYPE_INSTRUCTION: companyTypeInstructions[companyType] || companyTypeInstructions.sector,
    CV_SCHEMA: JSON.stringify(schema, null, 2)
  };

  const system = renderPrompt(
    systemTemplate,
    variables
  );

  const prompt = renderPrompt(
    promptTemplate,
    variables
  );

  if (!system.trim()) {
    throw new Error(
      "El system prompt generado está vacío"
    );
  }

  if (!prompt.trim()) {
    throw new Error(
      "El user prompt generado está vacío"
    );
  }

  return {
    system,
    prompt
  };
}
