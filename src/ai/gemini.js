import { GoogleGenAI } from "@google/genai";

import { AIProvider } from "./provider.js";

import geminiSchema from "../schema/cv.gemini.schema.json" with {
    type: "json"
};

export class GeminiProvider extends AIProvider {
    constructor({ apiKey }) {
        super();

        if (!apiKey) {
            throw new Error(
                "GEMINI_API_KEY no está configurada."
            );
        }

        this.client = new GoogleGenAI({
            apiKey
        });
    }

    async generate({
        systemPrompt,
        userPrompt,
        model,
        temperature = 0.6,
        maxTokens = 16384,
    }) {
        const started = performance.now();

        if (!model) {
            throw new Error(
                "Gemini: no se ha especificado ningún modelo."
            );
        }

        if (
            typeof systemPrompt !== "string" ||
            !systemPrompt.trim()
        ) {
            throw new Error(
                "Gemini: systemPrompt está vacío o no es válido."
            );
        }

        if (
            typeof userPrompt !== "string" ||
            !userPrompt.trim()
        ) {
            throw new Error(
                "Gemini: userPrompt está vacío o no es válido."
            );
        }

        const config = {
            systemInstruction: systemPrompt,
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json",
            responseJsonSchema: geminiSchema
        };

        try {
            const response =
                await this.client.models.generateContent({
                    model,
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: userPrompt
                                }
                            ]
                        }
                    ],
                    config
                });

            const candidate =
                response.candidates?.[0];

            const finishReason =
                candidate?.finishReason ?? null;

            const responseText =
                response.text?.trim() || "";

            if (!responseText) {
                const promptFeedback =
                    response.promptFeedback;

                console.error(
                    "Gemini devolvió una respuesta sin texto."
                );

                if (finishReason) {
                    console.error(
                        `Finish reason: ${finishReason}`
                    );
                }

                if (promptFeedback) {
                    console.error(
                        "Prompt feedback:",
                        promptFeedback
                    );
                }

                throw new Error(
                    `Gemini no devolvió contenido de texto${finishReason
                        ? ` (finishReason: ${finishReason})`
                        : ""
                    }.`
                );
            }
            if (finishReason === "MAX_TOKENS") {
                throw new Error(
                    `Gemini agotó maxOutputTokens (${maxTokens}). ` +
                    `Aumenta el límite de salida. | outputChars=${responseText.length}`
                );
            }

            let parsed = null;

            try {
                parsed = JSON.parse(responseText);
            } catch (error) {
                throw new Error(
                    `Gemini devolvió JSON inválido: ${error.message}` +
                    ` | finishReason=${finishReason ?? "unknown"}` +
                    ` | outputChars=${responseText.length}`
                );
            }

            const latencyMs = Math.round(
                performance.now() - started
            );

            const usage =
                response.usageMetadata;

            return {
                responseText,
                parsed,
                tokensInput:
                    usage?.promptTokenCount ?? null,
                tokensOutput:
                    usage?.candidatesTokenCount ?? null,
                latencyMs,
                rawMetadata: {
                    totalTokenCount:
                        usage?.totalTokenCount ?? null,
                    finishReason,
                    modelVersion:
                        response.modelVersion ?? null,
                    responseId:
                        response.responseId ?? null
                }
            };
        } catch (error) {
            const message =
                String(error.message || error);

            if (
                message.includes("429") ||
                message.includes("RESOURCE_EXHAUSTED") ||
                message.toLowerCase().includes("quota")
            ) {
                throw new Error(
                    `Gemini: cuota o límite de uso excedido. ${message}`
                );
            }

            if (
                message.includes("404") ||
                message.toLowerCase().includes("not found")
            ) {
                throw new Error(
                    `Gemini: modelo no encontrado o no disponible. ${message}`
                );
            }

            if (
                message.startsWith(
                    "Gemini: "
                )
            ) {
                throw error;
            }

            throw new Error(
                `Error llamando a Gemini: ${message}`
            );
        }
    }
}

export async function listGeminiModels(apiKey) {
    if (!apiKey) {
        throw new Error(
            "GEMINI_API_KEY no está configurada."
        );
    }

    const client = new GoogleGenAI({
        apiKey
    });

    const pager =
        await client.models.list();

    const models = [];

    for await (const model of pager) {
        const supportedActions =
            model.supportedActions ?? [];

        if (
            !supportedActions.includes(
                "generateContent"
            )
        ) {
            continue;
        }

        const id =
            model.baseModelId ||
            model.name?.replace(
                /^models\//,
                ""
            );;

        if (!id) {
            continue;
        }

        models.push({
            id,
            name:
                model.displayName || id,
            provider: "gemini",
            supportsStructuredOutput: true
        });
    }

    return models;
}