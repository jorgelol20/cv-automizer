import {
  createInterface
} from "node:readline/promises";

import {
  stdin as input,
  stdout as output
} from "node:process";

import { listGeminiModels } from "./gemini.js";
import { listOllamaModels } from "./ollama.js";

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

export async function selectAIModel() {
  const rl = createInterface({
    input,
    output
  });

  try {
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

    models.forEach((model, index) => {
      const structured =
        model.supportsStructuredOutput
          ? " [JSON]"
          : "";

      console.log(
        `${index + 1}. ${model.name}${structured}`
      );
    });

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
      model
    };
  } finally {
    rl.close();
  }
}