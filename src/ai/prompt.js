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

export async function buildPrompt({
  userInfo,
  jobOffer,
  layout = "standard"
}) {
  const systemTemplate = await readFile(
    "ia/system.md",
    "utf-8"
  );

  const promptTemplate = await readFile(
    "ia/prompt.md",
    "utf-8"
  );

  const layoutInstruction =
    layout === "one-page"
      ? `=== CUMPLIR FORMATO ONE-PAGE ===`
      : `=== CUMPLIR FORMATO ESTÁNDAR ===`;

  if (!systemTemplate.trim()) {
    throw new Error(
      "ia/system.md está vacío"
    );
  }

  if (!promptTemplate.trim()) {
    throw new Error(
      "ia/prompt.md está vacío"
    );
  }

  // El formato JSON lo impone la salida estructurada
  // de cada proveedor (ver src/ai/*.js) + validación AJV
  // posterior en src/app.js. No se inyecta el schema
  // en el texto para ahorrar ~12 KB por llamada.
  const variables = {
    LAYOUT_INSTRUCTION: layoutInstruction,
    USER_INFO: userInfo,
    JOB_OFFER: jobOffer
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