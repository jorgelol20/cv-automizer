import { randomUUID } from "node:crypto";

import { AIProvider } from "./provider.js";

import { schemaParaGo } from "./wire-schema.js";

import { aviso } from "../util/aviso.js";

// OpenCode Go es la suscripción de pago de OpenCode.
// Se usa su endpoint OpenAI-compatible; el contrato canónico
// (src/schema/*.schema.json) se valida después con AJV.
const BASE_URL = (
    process.env.OPENCODE_GO_BASE_URL ||
    "https://opencode.ai/inference/go"
).replace(/\/+$/, "");

const CHAT_URL =
    `${BASE_URL}/openai/v1/chat/completions`;

const MODELS_URL = `${BASE_URL}/v1/models`;

// La API exige identificarse: sin sesión responde
// 400 MissingSessionID y los agentes deben enviar
// un user-agent propio.
const USER_AGENT = "cv-automizer/1.0";

const CATALOGO_TTL_MS = 5 * 60 * 1000;

// Los modelos de razonamiento consumen `max_tokens` pensando antes
// de escribir. El presupuesto configurado se reserva para la salida
// y se añade esta reserva para no cortar el JSON a medias.
// Medido con `deepseek-v4.1-flash` y effort `low`: ~8,3k razonando
// + ~2,7k de salida para un CV completo.
const RESERVA_RAZONAMIENTO = 16384;

// Lista de respaldo si el catálogo no responde
// (red caída). Solo modelos de chat con JSON fiable.
const MODELOS_RESPALDO = [
    "deepseek-v4.1-flash",
    "kimi-k3",
    "glm-5.3",
    "qwen3.8-max",
    "mimo-v2.6-flash"
];

// Catálogo cacheado por clave: evita una petición
// extra en cada generación. El TTL corto permite
// ver modelos nuevos sin reiniciar.
const cacheCatalogos = new Map();

function resolveApiKey(explicit) {
    return (
        explicit ||
        process.env.OPENCODE_GO_API_KEY ||
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

function normalizarModelo(entrada) {
    if (!entrada || typeof entrada !== "object") {
        return null;
    }

    // Solo modelos de chat: se excluyen embedding y
    // los de decisión (jev-*).
    if (entrada.type && entrada.type !== "chat") {
        return null;
    }

    const id = typeof entrada.id === "string"
        ? entrada.id.trim()
        : "";

    if (!id || id.startsWith("jev-")) {
        return null;
    }

    return {
        id,
        name: String(entrada.name ?? "").trim() || id,
        // Si el catálogo llega sin capacidades (models.dev caído),
        // se es optimista: el provider reintenta con json_object.
        supportsStructuredOutput: entrada.capabilities
            ? Boolean(entrada.capabilities.structured_output)
            : true,
        temperature:
            entrada.capabilities?.temperature !== false,
        reasoning: Boolean(
            entrada.capabilities?.reasoning?.supported
        ),
        efforts: Array.isArray(
            entrada.capabilities?.reasoning?.effort
        )
            ? entrada.capabilities.reasoning.effort
            : [],
        maxOutput: Number.isFinite(entrada.limit?.output)
            ? entrada.limit.output
            : null,
        free:
            entrada.cost?.text?.input?.price === 0,
        zeroRetention: entrada.go?.zdr === true
    };
}

async function cargarCatalogo(apiKey) {
    const cache = cacheCatalogos.get(apiKey);

    const ahora = Date.now();

    if (
        cache &&
        ahora - cache.creado < CATALOGO_TTL_MS
    ) {
        return cache.modelos;
    }

    let response;

    try {
        response = await fetch(MODELS_URL, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "User-Agent": USER_AGENT
            }
        });
    } catch (error) {
        throw new Error(
            `OpenCode Go: no se pudo consultar el catálogo de modelos (${error.message}).`
        );
    }

    if (!response.ok) {
        const mensaje =
            response.status === 401
                ? "OpenCode Go: API key inválida o sin permisos. Verifica OPENCODE_GO_API_KEY en tu archivo .env"
                : response.status === 403
                    ? "OpenCode Go: la clave no tiene una suscripción Go activa."
                    : `OpenCode Go: el catálogo de modelos respondió con HTTP ${response.status}.`;

        const error = new Error(mensaje);

        error.status = response.status;

        throw error;
    }

    const datos = await response.json();

    const raw = Array.isArray(datos)
        ? datos
        : Array.isArray(datos?.data)
            ? datos.data
            : [];

    const modelos = new Map();

    for (const entrada of raw) {
        const info = normalizarModelo(entrada);

        if (info) {
            modelos.set(info.id, info);
        }
    }

    cacheCatalogos.set(apiKey, {
        creado: ahora,
        modelos
    });

    return modelos;
}

async function errorHttp(response, model) {
    let detalle = "";

    try {
        detalle = await response.text();
    } catch {
        detalle = "";
    }

    let tipo = "";
    let mensajeApi = "";

    try {
        const datos = JSON.parse(detalle);

        tipo = String(datos?.error?.type ?? "");
        mensajeApi = String(datos?.error?.message ?? "");
    } catch {
        // La respuesta no es JSON: se usa el texto crudo.
    }

    const sufijo = mensajeApi
        ? ` ${mensajeApi}`
        : detalle
            ? ` ${detalle.slice(0, 300)}`
            : "";

    const crear = (mensaje) => {
        const error = new Error(mensaje);

        error.status = response.status;

        return error;
    };

    const sinSuscripcion =
        tipo === "EntitlementError" ||
        /subscription|suscrip/i.test(mensajeApi);

    if (response.status === 400) {
        if (
            tipo === "MissingSessionID" ||
            mensajeApi.includes("x-opencode-session")
        ) {
            return crear(
                "OpenCode Go: falta la cabecera x-opencode-session. Actualiza la aplicación."
            );
        }

        if (sinSuscripcion) {
            return crear(
                `OpenCode Go: tu workspace no tiene una suscripción Go activa.${sufijo}`
            );
        }

        return crear(
            `OpenCode Go: solicitud rechazada (HTTP 400).${sufijo}`.trim()
        );
    }

    if (response.status === 401) {
        return crear(
            "OpenCode Go: API key inválida o sin permisos. Verifica OPENCODE_GO_API_KEY en tu archivo .env"
        );
    }

    if (response.status === 403) {
        if (sinSuscripcion) {
            return crear(
                `OpenCode Go: tu workspace no tiene una suscripción Go activa.${sufijo}`
            );
        }

        return crear(
            `OpenCode Go: acceso denegado (HTTP 403). Puede que el modelo esté restringido en tu región o que la clave no tenga permisos.${sufijo}`.trim()
        );
    }

    if (response.status === 404) {
        return crear(
            `OpenCode Go: modelo "${model}" no encontrado o no disponible.`
        );
    }

    if (response.status === 429) {
        return crear(
            `OpenCode Go: límite de uso agotado (5 horas, semanal o mensual). Reintenta más tarde o cambia de modelo.${sufijo}`.trim()
        );
    }

    return crear(
        `OpenCode Go respondió con HTTP ${response.status}.${sufijo}`.trim()
    );
}

async function peticion(apiKey, sessionId, cuerpo) {
    let response;

    try {
        response = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "User-Agent": USER_AGENT,
                "x-opencode-session": sessionId
            },
            body: JSON.stringify(cuerpo)
        });
    } catch (error) {
        throw new Error(
            `Error llamando a OpenCode Go: ${error.message}`
        );
    }

    if (!response.ok) {
        throw await errorHttp(response, cuerpo.model);
    }

    return response.json();
}

function construirCuerpo({
    model,
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens,
    responseFormat,
    reasoningEffort
}) {
    const cuerpo = {
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
        max_tokens: maxTokens
    };

    if (Number.isFinite(temperature)) {
        cuerpo.temperature = temperature;
    }

    if (responseFormat) {
        cuerpo.response_format = responseFormat;
    }

    if (reasoningEffort) {
        cuerpo.reasoning_effort = reasoningEffort;
    }

    return cuerpo;
}

function ordenarModelos(entradas) {
    return [...entradas].sort((a, b) => {
        // Mismo criterio de privacidad que OpenCode Zen:
        // primero los que no retienen datos.
        if (a.zeroRetention !== b.zeroRetention) {
            return a.zeroRetention ? -1 : 1;
        }

        // Los modelos sin JSON fiable van al final: la CLI
        // no permite elegirlos y la TUI avisa.
        const aJson = a.supportsStructuredOutput !== false;
        const bJson = b.supportsStructuredOutput !== false;

        if (aJson !== bJson) {
            return aJson ? -1 : 1;
        }

        if (a.free !== b.free) {
            return a.free ? -1 : 1;
        }

        return a.id.localeCompare(b.id);
    });
}

function toModelEntry(info) {
    const gratis = info.free ? " (gratis)" : "";
    const zeroRetention = info.zeroRetention
        ? " [zero-retention]"
        : "";

    return {
        id: info.id,
        name: `${info.name}${gratis}${zeroRetention}`,
        provider: "opencode-go",
        supportsStructuredOutput:
            info.supportsStructuredOutput !== false,
        free: Boolean(info.free),
        zeroRetention: Boolean(info.zeroRetention)
    };
}

export class OpenCodeGoProvider extends AIProvider {
    constructor({ apiKey } = {}) {
        super();

        const resolved = resolveApiKey(apiKey);

        if (!resolved) {
            throw new Error(
                "OPENCODE_GO_API_KEY no está configurada."
            );
        }

        this.apiKey = resolved;

        // Una sesión estable por generación (CV + match):
        // la API la usa para enrutar y cachear.
        this.sessionId = randomUUID();
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
                "OpenCode Go: no se ha especificado ningún modelo."
            );
        }

        if (
            typeof systemPrompt !== "string" ||
            !systemPrompt.trim()
        ) {
            throw new Error(
                "OpenCode Go: systemPrompt está vacío o no es válido."
            );
        }

        if (
            typeof userPrompt !== "string" ||
            !userPrompt.trim()
        ) {
            throw new Error(
                "OpenCode Go: userPrompt está vacío o no es válido."
            );
        }

        // El catálogo es orientativo: si falla la red o el
        // modelo no está, se usan valores seguros y se sigue.
        let info = null;

        try {
            const catalogo = await cargarCatalogo(this.apiKey);

            info = catalogo.get(model) ?? null;
        } catch (error) {
            aviso(
                `OpenCode Go: no se pudo consultar el catálogo de modelos (${error.message}). Se usan valores por defecto.`
            );
        }

        // `maxTokens` es el presupuesto para la salida. Si el modelo
        // razona (o el catálogo no está disponible), se añade una
        // reserva para que el JSON no se corte pensando.
        const conReserva = info === null || info.reasoning;

        const solicitado = conReserva
            ? maxTokens + RESERVA_RAZONAMIENTO
            : maxTokens;

        const maxSalida = info?.maxOutput
            ? Math.min(solicitado, info.maxOutput)
            : solicitado;

        const temperatura =
            info && info.temperature === false
                ? null
                : temperature;

        // En tareas de extracción/estructura, `low` reduce el
        // razonamiento y evita agotar el presupuesto antes
        // de escribir el JSON.
        const reasoningEffort =
            info?.reasoning && info?.efforts?.includes("low")
                ? "low"
                : null;

        const schemaGo = schema
            ? schemaParaGo(schema)
            : null;

        const soportaSchema =
            !info || info.supportsStructuredOutput;

        const usarSchema =
            Boolean(schemaGo) && soportaSchema;

        const jsonObject = {
            type: "json_object"
        };

        let datos;

        if (usarSchema) {
            try {
                datos = await peticion(
                    this.apiKey,
                    this.sessionId,
                    construirCuerpo({
                        model,
                        systemPrompt,
                        userPrompt,
                        temperature: temperatura,
                        maxTokens: maxSalida,
                        responseFormat: {
                            type: "json_schema",
                            json_schema: {
                                name: "respuesta",
                                strict: true,
                                schema: schemaGo
                            }
                        },
                        reasoningEffort
                    })
                );
            } catch (error) {
                // Algunos modelos aceptan structured_output pero
                // rechazan el schema estricto al traducirlo a su
                // API nativa: se reintenta con JSON libre.
                if (
                    error.status !== 400 &&
                    error.status !== 422
                ) {
                    throw error;
                }

                aviso(
                    `OpenCode Go: el modelo "${model}" rechazó el JSON Schema estricto (${error.message}). Se reintenta con json_object.`
                );

                datos = await peticion(
                    this.apiKey,
                    this.sessionId,
                    construirCuerpo({
                        model,
                        systemPrompt,
                        userPrompt,
                        temperature: temperatura,
                        maxTokens: maxSalida,
                        responseFormat: jsonObject,
                        reasoningEffort
                    })
                );
            }
        } else {
            datos = await peticion(
                this.apiKey,
                this.sessionId,
                construirCuerpo({
                    model,
                    systemPrompt,
                    userPrompt,
                    temperature: temperatura,
                    maxTokens: maxSalida,
                    responseFormat: jsonObject,
                    reasoningEffort
                })
            );
        }

        const choice = datos.choices?.[0];

        const finishReason =
            choice?.finish_reason ?? "unknown";

        const responseText = String(
            choice?.message?.content ?? ""
        ).trim();

        const usage = datos.usage ?? {};

        const reasoningTokens =
            usage.completion_tokens_details?.reasoning_tokens ?? null;

        const soloRazonamiento =
            typeof choice?.message?.reasoning_content === "string" &&
            choice.message.reasoning_content.trim() !== "";

        const detalleTokens =
            reasoningTokens !== null
                ? ` | reasoning_tokens=${reasoningTokens}`
                : "";

        if (finishReason === "length") {
            throw new Error(
                `OpenCode Go truncó la respuesta (finish_reason: length) con max_tokens=${maxSalida}.` +
                (reasoningTokens
                    ? ` El modelo gastó ${reasoningTokens} tokens razonando.`
                    : "") +
                ` Sube "Tokens máx." en Modelos o elige un modelo sin razonamiento.` +
                ` | outputChars=${responseText.length}` +
                detalleTokens
            );
        }

        if (!responseText) {
            throw new Error(
                `OpenCode Go no devolvió contenido. finish_reason=${finishReason}` +
                (soloRazonamiento
                    ? " | el modelo solo devolvió razonamiento (reasoning_content)"
                    : "") +
                detalleTokens
            );
        }

        let parsed = null;

        try {
            parsed = JSON.parse(extractJson(responseText));
        } catch (error) {
            throw new Error(
                `OpenCode Go devolvió JSON inválido: ${error.message}` +
                ` | finish_reason=${finishReason}` +
                ` | outputChars=${responseText.length}`
            );
        }

        const latencyMs = Math.round(performance.now() - started);

        return {
            responseText,
            parsed,
            tokensInput: usage.prompt_tokens ?? null,
            tokensOutput: usage.completion_tokens ?? null,
            latencyMs,
            rawMetadata: {
                totalTokens: usage.total_tokens ?? null,
                finishReason,
                model: datos.model ?? model,
                reasoningTokens,
                allowance:
                    datos.opencode?.allowance ?? null
            }
        };
    }
}

export async function listOpencodeGoModels(apiKey) {
    const resolved = resolveApiKey(apiKey);

    if (!resolved) {
        throw new Error(
            "OPENCODE_GO_API_KEY no está configurada."
        );
    }

    try {
        const catalogo = await cargarCatalogo(resolved);

        if (catalogo.size > 0) {
            return ordenarModelos(
                [...catalogo.values()].map(toModelEntry)
            );
        }
    } catch (error) {
        // Una clave inválida o sin suscripción no debe
        // ocultarse con la lista de respaldo.
        if (error.status === 401 || error.status === 403) {
            throw error;
        }

        aviso(
            `OpenCode Go: no se pudo cargar el catálogo de modelos (${error.message}). Se usa la lista de respaldo.`
        );
    }

    return ordenarModelos(
        MODELOS_RESPALDO.map((id) =>
            toModelEntry({
                id,
                name: id,
                supportsStructuredOutput: true
            })
        )
    );
}
