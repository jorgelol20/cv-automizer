import { AIProvider } from "./provider.js";

const BASE_URL = (
    process.env.OPENCODE_ZEN_BASE_URL ||
    "https://opencode.ai/zen/v1"
).replace(/\/+$/, "");

// Modelos gratuitos servidos por `chat/completions`.
// Se priorizan los de zero-retention por contener el CV datos personales.
const ZERO_RETENTION_FIRST = [
    "space-bunny-free",
    "longcat-2.5-preview-free"
];

const KNOWN_FREE_MODELS = [
    "space-bunny-free",
    "longcat-2.5-preview-free",
    "big-pickle",
    "mimo-v2.6-flash-free",
    "mimo-v2.5-free",
    "ling-3.0-flash-fin-free",
    "nemotron-3-ultra-free",
    "nemotron-3.5-lightning-free"
];

const ZERO_RETENTION = new Set(ZERO_RETENTION_FIRST);

function resolveApiKey(explicit) {
    return (
        explicit ||
        process.env.OPENCODE_ZEN_API_KEY ||
        process.env.OPENCODE_API_KEY ||
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

function sortFreeModels(models) {
    return [...models].sort((a, b) => {
        const aZero = ZERO_RETENTION.has(a.id) ? 0 : 1;
        const bZero = ZERO_RETENTION.has(b.id) ? 0 : 1;

        if (aZero !== bZero) {
            return aZero - bZero;
        }

        return a.id.localeCompare(b.id);
    });
}

function toModelEntry(id) {
    const zeroRetention = ZERO_RETENTION.has(id);
    const suffix = id === "big-pickle" ? " (gratis)" : "";

    return {
        id,
        name: `${id}${suffix}${zeroRetention ? " [zero-retention]" : ""}`,
        provider: "opencode-zen",
        supportsStructuredOutput: true,
        free: true,
        zeroRetention
    };
}

export class OpenCodeZenProvider extends AIProvider {
    constructor({ apiKey } = {}) {
        super();

        const resolved = resolveApiKey(apiKey);

        if (!resolved) {
            throw new Error(
                "OPENCODE_ZEN_API_KEY no está configurada."
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
                "OpenCode Zen: no se ha especificado ningún modelo."
            );
        }

        if (
            typeof systemPrompt !== "string" ||
            !systemPrompt.trim()
        ) {
            throw new Error(
                "OpenCode Zen: systemPrompt está vacío o no es válido."
            );
        }

        if (
            typeof userPrompt !== "string" ||
            !userPrompt.trim()
        ) {
            throw new Error(
                "OpenCode Zen: userPrompt está vacío o no es válido."
            );
        }

        // El schema ya viaja dentro del prompt (ia/*.md).
        // Se pide json_object y se extrae el JSON de forma tolerante,
        // igual que hace el proveedor de Ollama.
        const body = {
            model,
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            temperature,
            max_tokens: maxTokens,
            response_format: {
                type: "json_object"
            }
        };

        if (schema) {
            body.metadata = {
                json_schema_hint: "respuesta JSON según el schema del prompt"
            };
        }

        let response;

        try {
            response = await fetch(
                `${BASE_URL}/chat/completions`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify(body)
                }
            );
        } catch (error) {
            throw new Error(
                `Error llamando a OpenCode Zen: ${error.message}`
            );
        }

        if (!response.ok) {
            if (
                response.status === 401 ||
                response.status === 403
            ) {
                throw new Error(
                    "OpenCode Zen: API key inválida o sin permisos. Verifica OPENCODE_ZEN_API_KEY en tu archivo .env"
                );
            }

            if (response.status === 404) {
                throw new Error(
                    `OpenCode Zen: modelo "${model}" no encontrado o no disponible.`
                );
            }

            if (response.status === 429) {
                throw new Error(
                    "OpenCode Zen: cuota o límite de uso excedido (HTTP 429). Reintenta más tarde."
                );
            }

            let detail = "";

            try {
                detail = await response.text();
            } catch {
                detail = "";
            }

            throw new Error(
                `OpenCode Zen respondió con HTTP ${response.status}. ${detail.slice(0, 300)}`.trim()
            );
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const responseText = String(
            choice?.message?.content ?? ""
        ).trim();

        if (!responseText) {
            throw new Error(
                `OpenCode Zen no devolvió contenido. finish_reason=${choice?.finish_reason ?? "unknown"}`
            );
        }

        let parsed = null;

        try {
            parsed = JSON.parse(extractJson(responseText));
        } catch (error) {
            throw new Error(
                `OpenCode Zen devolvió JSON inválido: ${error.message}` +
                ` | finish_reason=${choice?.finish_reason ?? "unknown"}` +
                ` | outputChars=${responseText.length}`
            );
        }

        const latencyMs = Math.round(performance.now() - started);
        const usage = data.usage ?? {};

        return {
            responseText,
            parsed,
            tokensInput: usage.prompt_tokens ?? null,
            tokensOutput: usage.completion_tokens ?? null,
            latencyMs,
            rawMetadata: {
                totalTokens: usage.total_tokens ?? null,
                finishReason: choice?.finish_reason ?? null,
                model: data.model ?? model
            }
        };
    }
}

function isFreeChatModel(id) {
    if (!id || typeof id !== "string") {
        return false;
    }

    // Jev usa /systemone y Muse Spark contributor-free usa /responses,
    // no son compatibles con chat/completions (fase 1).
    if (id.startsWith("jev-")) {
        return false;
    }

    if (
        id.startsWith("muse-spark-") &&
        id.endsWith("-free")
    ) {
        return false;
    }

    if (id === "big-pickle") {
        return true;
    }

    return id.endsWith("-free");
}

export async function listOpencodeModels(apiKey) {
    const resolved = resolveApiKey(apiKey);

    if (!resolved) {
        throw new Error(
            "OPENCODE_ZEN_API_KEY no está configurada."
        );
    }

    try {
        const response = await fetch(`${BASE_URL}/models`, {
            headers: {
                Authorization: `Bearer ${resolved}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const raw = Array.isArray(data)
            ? data
            : Array.isArray(data.data)
                ? data.data
                : [];

        const ids = raw
            .map((entry) =>
                typeof entry === "string"
                    ? entry
                    : entry?.id
            )
            .filter(isFreeChatModel);

        // Solo chat/completions en fase 1.
        // Se excluyen jev-* (/systemone) y
        // muse-spark-*-contributor-free (/responses).
        const unique = [...new Set(ids)];

        if (unique.length > 0) {
            return sortFreeModels(unique.map(toModelEntry));
        }
    } catch (error) {
        throw new Error(
            `Error obteniendo modelos de OpenCode Zen: ${error.message}`
        );
    }

    return sortFreeModels(KNOWN_FREE_MODELS.map(toModelEntry));
}
