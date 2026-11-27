import { AIProvider } from "./provider.js";

const BASE_URL = (
    process.env.GROQ_BASE_URL ||
    "https://api.groq.com/openai/v1"
).replace(/\/+$/, "");

// Modelos de respaldo con salida JSON fiable.
// Solo chat models; se excluyen audio y moderación
// (whisper-*, *guard*, distil-*).
const KNOWN_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "qwen/qwen3-32b"
];

function resolveApiKey(explicit) {
    return (
        explicit ||
        process.env.GROQ_API_KEY ||
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

function esModeloChatJson(id) {
    if (!id || typeof id !== "string") {
        return false;
    }

    const minusculas = id.toLowerCase();

    if (
        minusculas.startsWith("whisper") ||
        minusculas.startsWith("distil-") ||
        minusculas.includes("guard") ||
        minusculas.includes("tts") ||
        minusculas.includes("playground")
    ) {
        return false;
    }

    return true;
}

function toModelEntry(id) {
    return {
        id,
        name: id,
        provider: "groq",
        supportsStructuredOutput: true
    };
}

export class GroqProvider extends AIProvider {
    constructor({ apiKey } = {}) {
        super();

        const resolved = resolveApiKey(apiKey);

        if (!resolved) {
            throw new Error(
                "GROQ_API_KEY no está configurada."
            );
        }

        this.apiKey = resolved;
    }

    async generate({
        systemPrompt,
        userPrompt,
        model,
        temperature = 0.2,
        maxTokens = 16384
    }) {
        const started = performance.now();

        if (!model) {
            throw new Error(
                "Groq: no se ha especificado ningún modelo."
            );
        }

        if (
            typeof systemPrompt !== "string" ||
            !systemPrompt.trim()
        ) {
            throw new Error(
                "Groq: systemPrompt está vacío o no es válido."
            );
        }

        if (
            typeof userPrompt !== "string" ||
            !userPrompt.trim()
        ) {
            throw new Error(
                "Groq: userPrompt está vacío o no es válido."
            );
        }

        // No se inyecta el schema en el texto (ver ia/*.md):
        // se pide json_object (válido en todos los modelos)
        // y se extrae el JSON de forma tolerante,
        // igual que hace el proveedor de OpenCode Zen.
        // El contrato canónico se valida después
        // con AJV en src/app.js (validateCV).
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
                `Error llamando a Groq: ${error.message}`
            );
        }

        if (!response.ok) {
            if (
                response.status === 401 ||
                response.status === 403
            ) {
                throw new Error(
                    "Groq: API key inválida o sin permisos. Verifica GROQ_API_KEY en tu archivo .env"
                );
            }

            if (response.status === 404) {
                throw new Error(
                    `Groq: modelo "${model}" no encontrado o no disponible.`
                );
            }

            if (response.status === 429) {
                throw new Error(
                    "Groq: cuota o límite de uso excedido (HTTP 429). Reintenta más tarde."
                );
            }

            let detail = "";

            try {
                detail = await response.text();
            } catch {
                detail = "";
            }

            throw new Error(
                `Groq respondió con HTTP ${response.status}. ${detail.slice(0, 300)}`.trim()
            );
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const responseText = String(
            choice?.message?.content ?? ""
        ).trim();

        if (!responseText) {
            throw new Error(
                `Groq no devolvió contenido. finish_reason=${choice?.finish_reason ?? "unknown"}`
            );
        }

        if (choice?.finish_reason === "length") {
            throw new Error(
                `Groq truncó la respuesta (finish_reason: length). ` +
                `Aumenta el límite de salida. ` +
                `| outputChars=${responseText.length}`
            );
        }

        let parsed = null;

        try {
            parsed = JSON.parse(extractJson(responseText));
        } catch (error) {
            throw new Error(
                `Groq devolvió JSON inválido: ${error.message}` +
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

export async function listGroqModels(apiKey) {
    const resolved = resolveApiKey(apiKey);

    if (!resolved) {
        throw new Error(
            "GROQ_API_KEY no está configurada."
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
        const raw = Array.isArray(data?.data)
            ? data.data
            : [];

        const ids = raw
            .map((entry) =>
                typeof entry === "string"
                    ? entry
                    : entry?.id
            )
            .filter(esModeloChatJson);

        const unique = [...new Set(ids)].sort((a, b) =>
            a.localeCompare(b)
        );

        if (unique.length > 0) {
            return unique.map(toModelEntry);
        }
    } catch (error) {
        throw new Error(
            `Error obteniendo modelos de Groq: ${error.message}`
        );
    }

    return KNOWN_MODELS.map(toModelEntry);
}
