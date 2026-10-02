import { AIProvider } from "./provider.js";

function extractJson(text) {
  let cleaned = String(text ?? "").trim();

  // Quitar cercas de código Markdown (```json ... ```)
  const fenceMatch = cleaned.match(
    /```(?:json)?\s*([\s\S]*?)```/
  );

  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Quedarse con el bloque entre la primera { y la última }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return cleaned;
}

export class OllamaProvider extends AIProvider {
  constructor({
    baseUrl =
    process.env.OLLAMA_BASE_URL ||
    "http://localhost:11434"
  } = {}) {
    super();

    this.baseUrl = baseUrl.replace(
      /\/+$/,
      ""
    );
  }

  async generate({
    systemPrompt,
    userPrompt,
    model,
    temperature = 0.2,
    maxTokens = 8192,
    schema
  }) {
    const started = performance.now();

    if (!model) {
      throw new Error(
        "Ollama: no se ha especificado ningún modelo."
      );
    }

    if (
      typeof systemPrompt !== "string" ||
      !systemPrompt.trim()
    ) {
      throw new Error(
        "Ollama: systemPrompt está vacío o no es válido."
      );
    }

    if (
      typeof userPrompt !== "string" ||
      !userPrompt.trim()
    ) {
      throw new Error(
        "Ollama: userPrompt está vacío o no es válido."
      );
    }

    const numPredict = maxTokens;

    // El prompt del proyecto es grande (UserInfo + schemas):
    // si num_ctx es menor que prompt + salida, Ollama corta
    // la respuesta (done_reason "length") y el JSON sale truncado.
    const approxPromptTokens = Math.ceil(
      (systemPrompt.length + userPrompt.length) / 4
    );

    const numCtx = Math.min(
      32768,
      Math.max(
        8192,
        Math.ceil(
          (approxPromptTokens + numPredict + 512) / 1024
        ) * 1024
      )
    );

    if (approxPromptTokens + numPredict + 512 > 32768) {
      throw new Error(
        "Ollama: el prompt + salida estimada supera el contexto máximo " +
        "configurado (32768 tokens). Reduce UserInfo.md o usa Gemini."
      );
    }

    const body = {
      model,
      system: systemPrompt,
      prompt: userPrompt,
      stream: false,
      think: false,
      options: {
        temperature,
        num_predict: numPredict,
        num_ctx: numCtx
      }
    };

    if (schema) {
      body.format = schema;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Modelo "${model}" no encontrado en Ollama.`
          );
        }

        throw new Error(
          `Ollama respondió con HTTP ${response.status}.`
        );
      }

      const data =
        await response.json();
      const responseText =
        typeof data.response === "string"
          ? data.response.trim()
          : "";
      if (!responseText) {
        throw new Error(
          "Ollama no devolvió contenido."
        );
      }

      let parsed = null;

      const doneReason = data.done_reason ?? null;

      if (schema) {
        if (doneReason === "length") {
          throw new Error(
            "Ollama truncó la respuesta (done_reason: length). " +
            `prompt_tokens=${data.prompt_eval_count ?? "?"} ` +
            `output_tokens=${data.eval_count ?? "?"} ` +
            `num_ctx=${numCtx} num_predict=${numPredict}. ` +
            "Aumenta num_ctx o reduce el prompt."
          );
        }

        try {
          parsed = JSON.parse(
            extractJson(responseText)
          );
        } catch (error) {
          throw new Error(
            `Ollama devolvió JSON inválido: ${error.message}` +
            ` | done_reason=${doneReason ?? "unknown"}` +
            ` | outputChars=${responseText.length}`
          );
        }
      }

      const latencyMs =
        Math.round(
          performance.now() - started
        );

      return {
        responseText,
        parsed,
        tokensInput:
          data.prompt_eval_count ?? null,
        tokensOutput:
          data.eval_count ?? null,
        latencyMs,
        rawMetadata: {
          totalDuration:
            data.total_duration ?? null,
          loadDuration:
            data.load_duration ?? null,
          promptEvalDuration:
            data.prompt_eval_duration ?? null,
          evalDuration:
            data.eval_duration ?? null,
          doneReason:
            data.done_reason ?? null
        }
      };
    } catch (error) {
      const message =
        String(
          error.message || error
        );

      if (
        message.startsWith(
          "Modelo "
        ) ||
        message.startsWith(
          "Ollama respondió"
        ) ||
        message.startsWith(
          "Ollama no devolvió"
        ) ||
        message.startsWith(
          "Ollama devolvió"
        ) ||
        message.startsWith(
          "Ollama: "
        )
      ) {
        throw error;
      }

      throw new Error(
        `Error llamando a Ollama: ${message}`
      );
    }
  }
}

export async function listOllamaModels(
  baseUrl =
    process.env.OLLAMA_BASE_URL ||
    "http://localhost:11434"
) {
  const normalizedBaseUrl =
    baseUrl.replace(
      /\/+$/,
      ""
    );

  try {
    const response =
      await fetch(
        `${normalizedBaseUrl}/api/tags`
      );

    if (!response.ok) {
      throw new Error(
        `Ollama respondió con HTTP ${response.status} al listar modelos.`
      );
    }

    const data =
      await response.json();

    return (data.models ?? [])
      .map((model) => ({
        id: model.name,
        name: model.name,
        provider: "ollama",
        supportsStructuredOutput: true
      }));
  } catch (error) {
    throw new Error(
      `Error obteniendo modelos de Ollama: ${error.message}`
    );
  }
}
