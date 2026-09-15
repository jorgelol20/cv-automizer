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
  schema
}) {
  const systemTemplate = await readFile(
    "ia/system.md",
    "utf-8"
  );

  const promptTemplate = await readFile(
    "ia/prompt.md",
    "utf-8"
  );

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

  const variables = {
    USER_INFO: userInfo,
    JOB_OFFER: jobOffer,
    CV_SCHEMA: JSON.stringify(
      schema,
      null,
      2
    )
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