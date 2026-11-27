import { AIProvider } from "./provider.js";

import { schemaParaClaude } from "./wire-schema.js";

// El contrato canónico se valida después con AJV en src/app.js.
// Para `output_config.format` se sanea con wire-schema.js:
// la API de Claude solo acepta un subconjunto de JSON Schema
// y no admite restricciones como `minLength`, `minimum` o
// `maximum`. No se usa el SDK: fetch nativo.

const BASE_URL = (
    process.env.ANTHROPIC_BASE_URL ||
    "https://api.anthropic.com"
).replace(/\/+$/, "");

const ANTHROPIC_VERSION = "2023-06-01";

// Modelos de respaldo si `/v1/models`
// responde OK pero sin datos.
const KNOWN_MODELS = [
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001"
];

function resolveApiKey(explicit) {
    return (
        explicit ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.CLAUDE_API_KEY ||
        ""
    ).trim();
}

function extractJson(text) {
    let cleaned = String(text ?? "").trim();

    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);

    if (fenceMatch) {
        cleaned = fenceMatch[1].trim();
    }

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.slice(start, end + 1);
    }

    return cleaned;
}

function textoDeContenido(content) {
    if (!Array.isArray(content)) {
        return "";
    }

    return content
        .filter((bloque) => bloque?.type === "text")
        .map((bloque) => String(bloque.text ?? ""))
        .join("")
        .trim();
}

function toModelEntry(model) {
    const id = typeof model === "string"
        ? model
        : model?.id;

    if (!id) {
        return null;
    }

    const displayName = typeof model === "object"
        ? model.display_name || id
        : id;

    const soportaEstructurada =
        model?.capabilities?.structured_outputs?.supported ?? true;

    return {
        id,
        name: displayName,
        provider: "claude",
        supportsStructuredOutput: Boolean(soportaEstructurada)
    };
}

export class ClaudeProvider extends AIProvider {
    constructor({ apiKey } = {}) {
        super();

        const resolved = resolveApiKey(apiKey);

        if (!resolved) {
            throw new Error(
                "ANTHROPIC_API_KEY no está configurada."
            );
        }

        this.apiKey = resolved;
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
                "Claude: no se ha especificado ningún modelo."
            );
        }

        if (
            typeof systemPrompt !== "string" ||
            !systemPrompt.trim()
        ) {
            throw new Error(
                "Claude: systemPrompt está vacío o no es válido."
            );
        }

        if (
            typeof userPrompt !== "string" ||
            !userPrompt.trim()
        ) {
            throw new Error(
                "Claude: userPrompt está vacío o no es válido."
            );
        }

        // El schema canónico se sanea para `output_config.format`
        // y se valida con AJV después de la respuesta.
        const body = {
            model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            temperature
        };

        if (schema) {
            body.output_config = {
                format: {
                    type: "json_schema",
                    schema: schemaParaClaude(schema)
                }
            };
        }

        let response;

        try {
            response = await fetch(
                `${BASE_URL}/v1/messages`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": this.apiKey,
                        "anthropic-version": ANTHROPIC_VERSION
                    },
                    body: JSON.stringify(body)
                }
            );
        } catch (error) {
            throw new Error(
                `Error llamando a Claude: ${error.message}`
            );
        }

        if (!response.ok) {
            if (
                response.status === 401 ||
                response.status === 403
            ) {
                throw new Error(
                    "Claude: API key inválida o sin permisos. Verifica ANTHROPIC_API_KEY en tu archivo .env"
                );
            }

            if (response.status === 404) {
                throw new Error(
                    `Claude: modelo "${model}" no encontrado o no disponible.`
                );
            }

            if (response.status === 429) {
                throw new Error(
                    "Claude: cuota o límite de uso excedido (HTTP 429). Reintenta más tarde."
                );
            }

            let detail = "";

            try {
                detail = await response.text();
            } catch {
                detail = "";
            }

            throw new Error(
                `Claude respondió con HTTP ${response.status}. ${detail.slice(0, 300)}`.trim()
            );
        }

        const data = await response.json();
        const stopReason = data.stop_reason ?? null;
        const responseText = textoDeContenido(data.content);

        if (!responseText) {
            throw new Error(
                `Claude no devolvió contenido de texto. stop_reason=${stopReason ?? "unknown"}`
            );
        }

        if (stopReason === "max_tokens") {
            throw new Error(
                `Claude agotó max_tokens (${maxTokens}). ` +
                `Aumenta el límite de salida. ` +
                `| outputChars=${responseText.length}`
            );
        }

        let parsed = null;

        try {
            parsed = JSON.parse(extractJson(responseText));
        } catch (error) {
            throw new Error(
                `Claude devolvió JSON inválido: ${error.message}` +
                ` | stop_reason=${stopReason ?? "unknown"}` +
                ` | outputChars=${responseText.length}`
            );
        }

        const latencyMs = Math.round(performance.now() - started);
        const usage = data.usage ?? {};

        return {
            responseText,
            parsed,
            tokensInput: usage.input_tokens ?? null,
            tokensOutput: usage.output_tokens ?? null,
            latencyMs,
            rawMetadata: {
                totalTokens:
                    (usage.input_tokens ?? 0) +
                    (usage.output_tokens ?? 0),
                finishReason: stopReason,
                model: data.model ?? model
            }
        };
    }
}

export async function listClaudeModels(apiKey) {
    const resolved = resolveApiKey(apiKey);

    if (!resolved) {
        throw new Error(
            "ANTHROPIC_API_KEY no está configurada."
        );
    }

    try {
        const modelos = [];
        let afterId = null;

        for (let pagina = 0; pagina < 10; pagina++) {
            const params = new URLSearchParams({
                limit: "100"
            });

            if (afterId) {
                params.set("after_id", afterId);
            }

            const response = await fetch(
                `${BASE_URL}/v1/models?${params.toString()}`,
                {
                    headers: {
                        "x-api-key": resolved,
                        "anthropic-version": ANTHROPIC_VERSION
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const raw = Array.isArray(data?.data)
                ? data.data
                : [];

            for (const entry of raw) {
                const mapped = toModelEntry(entry);

                if (mapped) {
                    modelos.push(mapped);
                }
            }

            if (!data?.has_more || !data?.last_id) {
                break;
            }

            afterId = data.last_id;
        }

        const unicos = [
            ...new Map(
                modelos.map((entry) => [entry.id, entry])
            ).values()
        ];

        if (unicos.length > 0) {
            return unicos.sort((a, b) =>
                a.id.localeCompare(b.id)
            );
        }
    } catch (error) {
        throw new Error(
            `Error obteniendo modelos de Claude: ${error.message}`
        );
    }

    return KNOWN_MODELS.map((id) => toModelEntry(id));
}
