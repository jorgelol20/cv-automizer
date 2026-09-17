import "dotenv/config";

import { readInputFiles } from "./input/files.js";
import { parseUserInfo } from "./cv/source.js";

import { buildPrompt } from "./ai/prompt.js";
import { createAIProvider } from "./ai/factory.js";

import { validateCV } from "./cv/validate.js";
import { enforceTraceability } from "./cv/traceability.js";

import { renderMarkdown } from "./render/markdown.js";
import { renderHtml } from "./render/html.js";

import {
    saveCV,
    saveMarkdown,
    saveHtml
} from "./output/files.js";

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
    model
}) {
    const {
        userInfo,
        jobOffer
    } = await readInputFiles();

    const source =
        parseUserInfo(userInfo);

    const provider =
        createAIProvider(providerId);

    const {
        system,
        prompt
    } = await buildPrompt({
        userInfo,
        jobOffer,
        schema
    });

    const result =
        await provider.generate({
            systemPrompt: system,
            userPrompt: prompt,
            model,
            temperature: 0.2,
            maxTokens: 8192,
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
            jobOffer
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

    await saveCV(cv);

    const fileName = process.env.NOMBRE_ARCHIVO.replaceAll(' ', '');

    const markdown =
        renderMarkdown(cv);

    await saveMarkdown(markdown);

    const html =
        await renderHtml(cv);

    await saveHtml(html);

    await generatePdf(
        html,
        `output/CV-${fileName}.pdf`
    );



    return {
        cv,

        html,

        match,

        output: {
            json: `output/CV-${fileName}.json`,
            markdown: `output/CV-${fileName}.md`,
            html: `output/CV-${fileName}.html`,
            pdf: `output/CV-${fileName}.pdf`
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