import "dotenv/config";

import { readInputFiles } from "../input/files.js";
import { parseUserInfo } from "../cv/source.js";

import { buildGeneralPrompt } from "./prompt.js";
import { createAIProvider } from "../ai/factory.js";

import { resolverParamsModelo } from "../config/modelos.js";

import { validateGeneral } from "./validate.js";

import { enforceGeneralTraceability } from "./traceability.js";

import {
  renderLetterHtml,
  renderLetterMarkdown
} from "./letter.js";
import { renderEmailHtml } from "./email.js";

import { saveGeneralKit } from "../output/general-files.js";

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
  layout = "standard",
  temperatureGeneral,
  maxTokensGeneral,
  temperatureCV,
  maxTokensCV,
  temperatureMatch,
  maxTokensMatch,
  skipMatch = false,
  onProgress,
  onStage
}) {
  // Progreso desacoplado de la consola (la TUI
  // pasa su propio registro; el escritorio y la
  // CLI mantienen la salida por defecto).
  const avisar = typeof onProgress === "function"
    ? onProgress
    : (mensaje) => console.log(mensaje);

  const avisarEtapa = typeof onStage === "function"
    ? onStage
    : () => {};

  avisarEtapa("loading");

  const { userInfo } = await readInputFiles();

  const source = parseUserInfo(userInfo);

  const provider = createAIProvider(providerId);

  const params = await resolverParamsModelo(
    providerId,
    {
      temperatureGeneral,
      maxTokensGeneral,
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

  avisar("✉️ Generando carta y email…");

  avisarEtapa("kit");

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
    model: modeloEfectivo,
    temperature: params.temperatureGeneral,
    maxTokens: params.maxTokensGeneral,
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
  const letterHtml = renderLetterHtml(kit, source);

  await saveGeneralKit(fileName, kit, letterMarkdown);

  const emailHtml = renderEmailHtml(kit, source);
  await saveGeneralKit(fileName, kit, emailHtml, "email");

  avisarEtapa("kitPdf");

  await generatePdf(
    letterHtml,
    `output/${fileName}-Carta.pdf`
  );

  await generatePdf(
    emailHtml,
    `output/${fileName}-Email.pdf`
  );

  // Generar CV adaptado a la empresa:
  // reutiliza CV-{usuario}-{empresa} vía generateCV.
  avisar("📄 Generando CV adaptado a la empresa…");

  avisarEtapa("cv");

  const cvResult = await generateCV({
    provider: providerId,
    model: modeloEfectivo,
    layout,
    companyName,
    companyType,
    temperatureCV: params.temperatureCV,
    maxTokensCV: params.maxTokensCV,
    temperatureMatch: params.temperatureMatch,
    maxTokensMatch: params.maxTokensMatch,
    skipMatch,
    onProgress: avisar,
    onStage: (stage) => {
      if (stage === "saving" || stage === "pdf") {
        avisarEtapa("cvPdf");
        return;
      }

      avisarEtapa("cv");
    }
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
