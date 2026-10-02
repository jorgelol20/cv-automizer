import "dotenv/config";

import { readInputFiles } from "../input/files.js";
import { parseUserInfo } from "../cv/source.js";

import { buildGeneralPrompt } from "./prompt.js";
import { createAIProvider } from "../ai/factory.js";

import { validateGeneral } from "./validate.js";

import { enforceGeneralTraceability } from "./traceability.js";

import { renderLetterMarkdown } from "./letter.js";
import { renderEmailHtml } from "./email.js";

import {
  saveGeneralKit,
  saveLetterPdf,
  saveEmailPdf
} from "../output/general-files.js";

import {
  buildGeneralBaseFileName
} from "../output/naming.js";

import { generatePdf } from "../pdf/pdf.js";

import { generateCV } from "../app.js";

import generalSchema from "../schema/general.schema.json" with {
  type: "json"
};

export async function generateGeneralKit({
  provider: providerId,
  model,
  companyName,
  companyType,
  tone,
  letterLength,
  layout = "standard"
}) {
  const { userInfo } = await readInputFiles();

  const source = parseUserInfo(userInfo);

  const provider = createAIProvider(providerId);

  const { system, prompt } = await buildGeneralPrompt({
    userInfo,
    companyName,
    companyType,
    tone,
    letterLength,
    schema: generalSchema
  });

  const result = await provider.generate({
    systemPrompt: system,
    userPrompt: prompt,
    model,
    temperature: 0.3,
    maxTokens: 4096,
    schema: generalSchema
  });

  if (!result.parsed) {
    throw new Error(
      "El proveedor no devolvió un resultado JSON."
    );
  }

  const kit = result.parsed;

  enforceGeneralTraceability(kit, source);

  if (process.env.NOMBRE_USUARIO?.trim()) {
    source.name =
      process.env.NOMBRE_USUARIO.trim();
  }

  const validation = validateGeneral(kit, generalSchema);

  if (!validation.valid) {
    const errors = validation.errors
      .map(
        (error) =>
          `${error.instancePath || "/"}: ${error.message}`
      )
      .join("\n");

    throw new Error(
      `El kit generado no cumple el schema:\n${errors}`
    );
  }

  const fileName = buildGeneralBaseFileName(companyName);

  const letterMarkdown = renderLetterMarkdown(kit, source);
  await saveGeneralKit(fileName, kit, letterMarkdown);

  const emailHtml = renderEmailHtml(kit, source);
  await saveGeneralKit(fileName, kit, emailHtml, "email");

  await generatePdf(
    letterMarkdown,
    `output/${fileName}-Carta.pdf`
  );

  await generatePdf(
    emailHtml,
    `output/${fileName}-Email.pdf`
  );

  // Generar CV adaptado a la empresa:
  // reutiliza CV-{usuario}-{empresa} vía generateCV.
  const cvResult = await generateCV({
    provider: providerId,
    model,
    layout,
    companyName,
    companyType
  });

  return {
    kit,
    cv: cvResult.cv,
    output: {
      letter: `output/${fileName}-Carta.md`,
      email: `output/${fileName}-Email.html`,
      letterPdf: `output/${fileName}-Carta.pdf`,
      emailPdf: `output/${fileName}-Email.pdf`,
      cvJson: cvResult.output.json,
      cvMarkdown: cvResult.output.markdown,
      cvHtml: cvResult.output.html,
      cvPdf: cvResult.output.pdf
    },
    metrics: {
      tokensInput: result.tokensInput + (cvResult.metrics?.tokensInput || 0),
      tokensOutput: result.tokensOutput + (cvResult.metrics?.tokensOutput || 0),
      latencyMs: result.latencyMs + (cvResult.metrics?.latencyMs || 0)
    }
  };
}
