import "dotenv/config";

import { readInputFiles } from "./input/files.js";
import { parseUserInfo } from "./cv/source.js";

import { buildPrompt } from "./ai/prompt.js";
import { createAIProvider } from "./ai/factory.js";

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
    companyType = ""
}) {
    const {
        userInfo,
        jobOffer
    } = await readInputFiles();

    const source =
        parseUserInfo(userInfo);

    const provider =
        createAIProvider(providerId);

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
        schema,
        layout
    });

    const result =
        await provider.generate({
            systemPrompt: system,
            userPrompt: prompt,
            model,
            temperature: 0.2,
            maxTokens: 16384,
            schema
        });

    if (!result.parsed) {
        throw new Error(
            "El proveedor no devolvió un CV JSON."
        );
    }

    const cv = result.parsed;

    // La información canónica sirve para
    // corregir datos que nunca debe modificar la IA.
    cv.name = source.name;
    cv.contact = source.contact;

    const matchPrompt =
        buildMatchPrompt({
            cv,
            jobOffer: effectiveJobOffer
        });

    console.log();
    console.log(
        "📊 Evaluando match con la oferta..."
    );

    const matchResult =
        await provider.generate({
            systemPrompt: matchPrompt.system,
            userPrompt: matchPrompt.prompt,
            model,
            temperature: 0.1,
            maxTokens: 2048,
            schema: matchSchema
        });

    if (!matchResult.parsed) {
        throw new Error(
            "El evaluador no devolvió un resultado JSON."
        );
    }

    const match = matchResult.parsed;

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

    console.log(
        `🎯 Match: ${match.score}/100`
    );

    enforceTraceability(
        cv,
        userInfo
    );


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