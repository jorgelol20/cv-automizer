import { AIProvider } from "./provider.js";

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
    maxTokens = 16384,
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

    const body = {
      model,
      system: systemPrompt,
      prompt: userPrompt,
      stream: false,
      think: false,
      options: {
        temperature,
        num_predict: maxTokens
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

      if (schema) {
        try {
          parsed = JSON.parse(
            responseText
          );
        } catch (error) {
          throw new Error(
            `Ollama devolvió JSON inválido: ${error.message}` +
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
