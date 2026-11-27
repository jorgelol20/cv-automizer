import "dotenv/config";

import { readInputFiles } from "./input/files.js";
import { parseUserInfo } from "./cv/source.js";

import { buildPrompt } from "./ai/prompt.js";
import { createAIProvider } from "./ai/factory.js";

import { resolverParamsModelo } from "./config/modelos.js";

import { validateCV, validateMatch } from "./cv/validate.js";
import { enforceTraceability } from "./cv/traceability.js";

import { renderMarkdown } from "./render/markdown.js";
import { renderHtml } from "./render/html.js";

import {
    saveCV,
    saveMarkdown,
    saveHtml
} from "./output/files.js";

import {
    buildCVBaseFileName
} from "./output/naming.js";

import { generatePdf } from "./pdf/pdf.js";

import schema from "./schema/cv.schema.json" with {
    type: "json"
};

import {
    buildMatchPrompt
} from "./ai/match.js";

import matchSchema from "./schema/cv.match.schema.json" with {
    type: "json"
};

export async function generateCV({
    provider: providerId,
    model,
    layout = "standard",
    companyName = "",
    companyType = "",
    temperatureCV,
    maxTokensCV,
    temperatureMatch,
    maxTokensMatch,
    skipMatch = false,
    onProgress,
    onStage
}) {
    // Progreso desacoplado de la consola: la CLI
    // usa console.log por defecto y la TUI pasa su
    // propio registro. Sin esto, cualquier log
    // rompería el frame de la TUI.
    const avisar = typeof onProgress === "function"
        ? onProgress
        : (mensaje) => console.log(mensaje);

    // Etapas legibles por máquina para el
    // indicador de progreso del escritorio.
    const avisarEtapa = typeof onStage === "function"
        ? onStage
        : () => {};

    avisarEtapa("loading");

    const {
        userInfo,
        jobOffer
    } = await readInputFiles();

    const source =
        parseUserInfo(userInfo);

    const provider =
        createAIProvider(providerId);

    // Parámetros efectivos: opción explícita >
    // config local (config/modelos.json) >
    // defecto del código. La capa de IA recibe
    // los valores ya resueltos, sin cambios.
    const params = await resolverParamsModelo(
        providerId,
        {
            temperatureCV,
            maxTokensCV,
            temperatureMatch,
            maxTokensMatch
        }
    );

    const modeloEfectivo =
        String(model ?? "").trim() || params.model || "";

    if (!modeloEfectivo) {
        throw new Error(
            "No hay modelo seleccionado. Elige uno al generar o guarda un favorito en la configuración de modelos."
        );
    }

    // Construir prompt adaptado si hay empresa
    const effectiveJobOffer = companyName
        ? `CANDIDATURA ESPONTÁNEA\n\nEmpresa: ${companyName}\nTipo: ${companyType}\n\nEl candidato se postula de forma espontánea a esta empresa. Adapta el CV para destacar los aspectos más relevantes para este tipo de empresa.`
        : jobOffer;

    const {
        system,
        prompt
    } = await buildPrompt({
        userInfo,
        jobOffer: effectiveJobOffer,
        layout
    });

    avisarEtapa("generating");

    const result =
        await provider.generate({
            systemPrompt: system,
            userPrompt: prompt,
            model: modeloEfectivo,
            temperature: params.temperatureCV,
            maxTokens: params.maxTokensCV,
            schema
        });

    if (!result.parsed) {
        throw new Error(
            "El proveedor no devolvió un CV JSON."
        );
    }

    const cv = result.parsed;

    if (
        !cv ||
        typeof cv !== "object" ||
        Array.isArray(cv)
    ) {
        throw new Error(
            "El proveedor no devolvió un objeto CV válido."
        );
    }

    // La información canónica sirve para
    // corregir datos que nunca debe modificar la IA.
    cv.name = source.name;
    cv.contact = source.contact;

    // La trazabilidad se aplica antes del match:
    // el evaluador debe puntuar el CV que se entrega,
    // no la salida cruda con posibles skills inventadas.
    enforceTraceability(
        cv,
        userInfo
    );

    // Evaluación de match opcional: ahorra una
    // segunda llamada al proveedor cuando no se necesita.
    let match = null;

    if (!skipMatch) {
        const matchPrompt =
            buildMatchPrompt({
                cv,
                jobOffer: effectiveJobOffer
            });

        avisarEtapa("match");
        avisar("📊 Evaluando match con la oferta…");

        const matchResult =
            await provider.generate({
                systemPrompt: matchPrompt.system,
                userPrompt: matchPrompt.prompt,
                model: modeloEfectivo,
                temperature: params.temperatureMatch,
                maxTokens: params.maxTokensMatch,
                schema: matchSchema
            });

        if (!matchResult.parsed) {
            throw new Error(
                "El evaluador no devolvió un resultado JSON."
            );
        }

        match = matchResult.parsed;

        const matchValidation =
            validateMatch(
                match,
                matchSchema
            );

        if (!matchValidation.valid) {
            const errors =
                matchValidation.errors
                    .map(
                        (error) =>
                            `${error.instancePath || "/"}: ${error.message}`
                    )
                    .join("\n");

            throw new Error(
                `El evaluador devolvió un resultado inválido:\n${errors}`
            );
        }

        avisar(`🎯 Match: ${match.score}/100`);
    }

    if (process.env.NOMBRE_USUARIO?.trim()) {
        cv.name =
            process.env.NOMBRE_USUARIO.trim();
    }

    const validation =
        validateCV(
            cv,
            schema
        );

    if (!validation.valid) {
        const errors =
            validation.errors
                .map(
                    (error) =>
                        `${error.instancePath || "/"}: ${error.message}`
                )
                .join("\n");

        throw new Error(
            `El CV generado no cumple el schema:\n${errors}`
        );
    }

    const baseFileName = buildCVBaseFileName(companyName);

    avisarEtapa("saving");

    await saveCV(cv, baseFileName);

    const markdown =
        renderMarkdown(cv);

    await saveMarkdown(markdown, baseFileName);

    const html =
        await renderHtml(
            cv,
            { layout }
        );

    await saveHtml(html, baseFileName);

    avisarEtapa("pdf");

    await generatePdf(
        html,
        `output/${baseFileName}.pdf`
    );



    return {
        cv,

        html,

        match,

        output: {
            json: `output/${baseFileName}.json`,
            markdown: `output/${baseFileName}.md`,
            html: `output/${baseFileName}.html`,
            pdf: `output/${baseFileName}.pdf`
        },

        metrics: {
            tokensInput:
                result.tokensInput,

            tokensOutput:
                result.tokensOutput,

            latencyMs:
                result.latencyMs
        }
    };
}