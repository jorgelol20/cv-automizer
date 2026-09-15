import "dotenv/config";

import { createInterface } from "node:readline/promises";
import {
  stdin as input,
  stdout as output
} from "node:process";

import { listGeminiModels } from "./ai/gemini.js";
import { listOllamaModels } from "./ai/ollama.js";
import { generateCV } from "./app.js";

const PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini"
  },
  {
    id: "ollama",
    name: "Ollama"
  }
];

async function listModels(provider) {
  switch (provider) {
    case "gemini":
      return listGeminiModels(
        process.env.GEMINI_API_KEY
      );

    case "ollama":
      return listOllamaModels();

    default:
      throw new Error(
        `Proveedor desconocido: ${provider}`
      );
  }
}

async function selectAIModel(rl) {
  console.log("🤖 Proveedor de IA");
  console.log();

  PROVIDERS.forEach(
    (provider, index) => {
      console.log(
        `${index + 1}. ${provider.name}`
      );
    }
  );

  console.log();

  const providerAnswer =
    await rl.question(
      "Selecciona proveedor: "
    );

  const providerIndex =
    Number.parseInt(
      providerAnswer,
      10
    ) - 1;

  const provider =
    PROVIDERS[providerIndex];

  if (!provider) {
    throw new Error(
      "Proveedor de IA no válido."
    );
  }

  console.log();
  console.log(
    `🔎 Consultando modelos de ${provider.name}...`
  );

  const models =
    await listModels(provider.id);

  if (models.length === 0) {
    throw new Error(
      `No hay modelos disponibles para ${provider.name}.`
    );
  }

  console.log();
  console.log(
    `🧠 Modelos de ${provider.name}`
  );
  console.log();

  models.forEach(
    (model, index) => {
      const structured =
        model.supportsStructuredOutput
          ? " [JSON]"
          : "";

      console.log(
        `${index + 1}. ${model.name}${structured}`
      );
    }
  );

  console.log();

  const modelAnswer =
    await rl.question(
      "Selecciona modelo: "
    );

  const modelIndex =
    Number.parseInt(
      modelAnswer,
      10
    ) - 1;

  const model =
    models[modelIndex];

  if (!model) {
    throw new Error(
      "Modelo de IA no válido."
    );
  }

  return {
    provider: provider.id,
    model: model.id,
    modelInfo: model
  };
}

async function main() {
  console.log("🚀 Generador de CV");
  console.log();

  const rl = createInterface({
    input,
    output
  });

  try {
    const selection =
      await selectAIModel(rl);

    console.log();
    console.log(
      `🤖 Proveedor: ${selection.provider}`
    );
    console.log(
      `🧠 Modelo: ${selection.modelInfo.name}`
    );

    if (
      !selection.modelInfo
        .supportsStructuredOutput
    ) {
      throw new Error(
        `El modelo "${selection.modelInfo.name}" no soporta salida estructurada.`
      );
    }

    console.log();
    console.log(
      "🤖 Generando CV..."
    );

    const result =
      await generateCV({
        provider: selection.provider,
        model: selection.model
      });

    console.log();
    console.log(
      "✅ CV generado correctamente"
    );

    console.log(
      `💾 JSON: ${result.output.json}`
    );

    console.log(
      `📝 Markdown: ${result.output.markdown}`
    );

    console.log(
      `🌐 HTML: ${result.output.html}`
    );

    console.log(
      `📄 PDF: ${result.output.pdf}`
    );

    if (result.metrics) {
      console.log();
      console.log("📊 Métricas");

      if (
        result.metrics.tokensInput != null
      ) {
        console.log(
          `Entrada: ${result.metrics.tokensInput}`
        );
      }

      if (
        result.metrics.tokensOutput != null
      ) {
        console.log(
          `Salida: ${result.metrics.tokensOutput}`
        );
      }

      if (
        result.metrics.latencyMs != null
      ) {
        console.log(
          `Tiempo: ${result.metrics.latencyMs} ms`
        );
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error();
  console.error("❌ Error:");
  console.error(error);
  process.exit(1);
});