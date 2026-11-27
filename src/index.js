import "dotenv/config";

import { createInterface } from "node:readline/promises";
import {
  stdin as input,
  stdout as output
} from "node:process";

import { listClaudeModels } from "./ai/claude.js";
import { listGeminiModels } from "./ai/gemini.js";
import { listGroqModels } from "./ai/groq.js";
import { listOllamaModels } from "./ai/ollama.js";
import { listOpencodeGoModels } from "./ai/opencode-go.js";
import { listOpencodeModels } from "./ai/opencode.js";
import { generateCV } from "./app.js";
import {
  getKeysStatus,
  setKey,
  clearKey
} from "./config/keys.js";
import {
  getModelosConfig,
  setModeloConfig,
  setDefaults,
  resetModeloConfig,
  resolverModelo,
  CAMPOS
} from "./config/modelos.js";

const PROVIDERS = [
  {
    id: "opencode-zen",
    name: "OpenCode Zen (gratis)"
  },
  {
    id: "opencode-go",
    name: "OpenCode Go (de pago)"
  },
  {
    id: "gemini",
    name: "Google Gemini"
  },
  {
    id: "claude",
    name: "Claude (Anthropic)"
  },
  {
    id: "groq",
    name: "Groq"
  },
  {
    id: "ollama",
    name: "Ollama"
  }
];

async function listModels(provider) {
  switch (provider) {
    case "opencode-zen":
      return listOpencodeModels(
        process.env.OPENCODE_ZEN_API_KEY ||
        process.env.OPENCODE_API_KEY
      );

    case "opencode-go":
      return listOpencodeGoModels(
        process.env.OPENCODE_GO_API_KEY ||
        process.env.OPENCODE_API_KEY
      );

    case "gemini":
      return listGeminiModels(
        process.env.GEMINI_API_KEY
      );

    case "claude":
      return listClaudeModels(
        process.env.ANTHROPIC_API_KEY ||
        process.env.CLAUDE_API_KEY
      );

    case "groq":
      return listGroqModels(
        process.env.GROQ_API_KEY
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

  // Favorito guardado (si falla la lectura,
  // se sigue sin marcar, sin romper).
  let favoritoGuardado = "";

  try {
    favoritoGuardado = await resolverModelo(
      provider.id
    );
  } catch {
    favoritoGuardado = "";
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

      const favorito =
        model.id === favoritoGuardado
          ? " ★ favorito"
          : "";

      console.log(
        `${index + 1}. ${model.name}${structured}${favorito}`
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

async function printKeysStatus() {
  const claves = await getKeysStatus();

  console.log("🔑 API Keys locales (enmascaradas)");
  console.log();

  claves.forEach((clave, index) => {
    const marca = clave.configured ? "✅" : "❌";
    const valor = clave.configured
      ? `${clave.masked} (${clave.source})`
      : "no configurada";

    console.log(
      `${index + 1}. ${marca} ${clave.etiqueta} [${clave.name}]: ${valor}`
    );
  });

  console.log();

  return claves;
}

async function manageApiKeys(rl) {
  while (true) {
    const claves = await printKeysStatus();

    console.log("0. Volver");
    console.log();

    const respuesta = await rl.question(
      "Elige clave para editar (0 para volver): "
    );

    const indice =
      Number.parseInt(respuesta, 10);

    if (indice === 0) {
      return;
    }

    const clave = claves[indice - 1];

    if (!clave) {
      console.log();
      console.log("❌ Opción no válida.");
      console.log();
      continue;
    }

    console.log();
    console.log(
      `🔑 ${clave.etiqueta} [${clave.name}]`
    );
    console.log(
      "1. Guardar nueva (pegar)"
    );
    console.log("2. Borrar (dejar vacía)");
    console.log("0. Volver");
    console.log();

    const accion = await rl.question(
      "Elige acción: "
    );

    if (accion === "0") {
      console.log();
      continue;
    }

    if (accion === "1") {
      const valor = await rl.question(
        "Pega la nueva clave: "
      );

      try {
        const resultado = await setKey(
          clave.name,
          valor
        );

        console.log();
        console.log(
          `✅ ${resultado.name} guardada (${resultado.masked}).`
        );
      } catch (error) {
        console.log();
        console.log(`❌ ${error.message}`);
      }

      console.log();
      continue;
    }

    if (accion === "2") {
      try {
        await clearKey(clave.name);

        console.log();
        console.log(
          `🗑️ ${clave.name} borrada (vacía).`
        );
      } catch (error) {
        console.log();
        console.log(`❌ ${error.message}`);
      }

      console.log();
      continue;
    }

    console.log();
    console.log("❌ Acción no válida.");
    console.log();
  }
}

const ETIQUETAS_CAMPOS = {
  model: "Modelo favorito",
  temperatureCV: "Temperatura CV",
  maxTokensCV: "Tokens máx. CV",
  temperatureMatch: "Temperatura match",
  maxTokensMatch: "Tokens máx. match",
  temperatureGeneral: "Temperatura general",
  maxTokensGeneral: "Tokens máx. general"
};

async function printModelosStatus() {
  const config = await getModelosConfig();

  console.log("🧠 Configuración de modelos (local)");
  console.log();
  console.log("Defectos:");

  for (const [campo, valor] of Object.entries(config.defaults)) {
    console.log(`  ${ETIQUETAS_CAMPOS[campo]}: ${valor}`);
  }

  console.log();

  const entradas = Object.entries(config.providers);

  entradas.forEach(([id, entrada], index) => {
    const fijados = Object.entries(entrada.valores).filter(
      ([, valor]) => valor !== null
    );

    if (fijados.length === 0) {
      console.log(
        `${index + 1}. ❌ ${entrada.etiqueta} [${id}]: hereda defectos`
      );
      return;
    }

    const resumen = fijados
      .map(([campo, valor]) => `${campo}=${valor}`)
      .join(", ");

    console.log(
      `${index + 1}. ✅ ${entrada.etiqueta} [${id}]: ${resumen}`
    );
  });

  console.log();
  console.log(`${entradas.length + 1}. Defectos globales`);
  console.log("0. Volver");
  console.log();

  return config;
}

async function editarDefaults(rl, config) {
  while (true) {
    console.log();
    console.log("🧠 Defectos globales");

    const campos = Object.keys(config.defaults);

    campos.forEach((campo, index) => {
      console.log(
        `${index + 1}. ${ETIQUETAS_CAMPOS[campo]}: ${config.defaults[campo]}`
      );
    });

    console.log("0. Volver");
    console.log();

    const respuesta = await rl.question(
      "Elige campo para editar (0 para volver): "
    );

    if (respuesta.trim() === "0") {
      return;
    }

    const campo = campos[Number.parseInt(respuesta, 10) - 1];

    if (!campo) {
      console.log();
      console.log("❌ Opción no válida.");
      continue;
    }

    const valor = await rl.question(
      `Nuevo valor para ${ETIQUETAS_CAMPOS[campo]} (vacío = defecto de código): `
    );

    try {
      const resultado = await setDefaults(campo, valor);

      console.log();
      console.log(
        `✅ ${campo} = ${resultado.valor}.`
      );

      config = await getModelosConfig();
    } catch (error) {
      console.log();
      console.log(`❌ ${error.message}`);
    }
  }
}

async function editarProveedor(rl, provider, entrada) {
  while (true) {
    console.log();
    console.log(`🧠 ${entrada.etiqueta} [${provider}]`);

    CAMPOS.forEach((campo, index) => {
      const valor = entrada.valores[campo];
      const muestra = valor === null
        ? "(hereda)"
        : valor;

      console.log(
        `${index + 1}. ${ETIQUETAS_CAMPOS[campo]}: ${muestra}`
      );
    });

    console.log("R. Restablecer proveedor (borrar overrides)");
    console.log("0. Volver");
    console.log();

    const respuesta = await rl.question(
      "Elige campo para editar (0 para volver): "
    );

    if (
      respuesta.trim() === "0"
    ) {
      return;
    }

    if (
      respuesta.trim().toLowerCase() === "r"
    ) {
      try {
        await resetModeloConfig(provider);

        console.log();
        console.log(
          `🗑️ ${provider} restablecido (hereda todo).`
        );

        const config = await getModelosConfig();
        entrada = config.providers[provider];
      } catch (error) {
        console.log();
        console.log(`❌ ${error.message}`);
      }

      continue;
    }

    const campo = CAMPOS[Number.parseInt(respuesta, 10) - 1];

    if (!campo) {
      console.log();
      console.log("❌ Opción no válida.");
      continue;
    }

    const valor = await rl.question(
      `Nuevo valor para ${ETIQUETAS_CAMPOS[campo]} (vacío = heredar): `
    );

    try {
      const resultado = await setModeloConfig(
        provider,
        campo,
        valor
      );

      console.log();

      if (resultado.valor === null) {
        console.log(
          `✅ ${campo} limpiado (hereda).`
        );
      } else {
        console.log(
          `✅ ${campo} = ${resultado.valor}.`
        );
      }

      const config = await getModelosConfig();
      entrada = config.providers[provider];
    } catch (error) {
      console.log();
      console.log(`❌ ${error.message}`);
    }
  }
}

async function manageModelos(rl) {
  while (true) {
    let config;

    try {
      config = await printModelosStatus();
    } catch (error) {
      console.log(`❌ ${error.message}`);
      console.log();
      return;
    }

    const respuesta = await rl.question(
      "Elige proveedor para editar (0 para volver): "
    );

    const indice = Number.parseInt(respuesta, 10);

    if (indice === 0) {
      return;
    }

    const ids = Object.keys(config.providers);

    if (indice === ids.length + 1) {
      await editarDefaults(rl, config);
      continue;
    }

    const provider = ids[indice - 1];

    if (!provider) {
      console.log();
      console.log("❌ Opción no válida.");
      console.log();
      continue;
    }

    await editarProveedor(
      rl,
      provider,
      config.providers[provider]
    );
  }
}

async function main() {
  console.log("🚀 Generador de CV");
  console.log();

  const rl = createInterface({
    input,
    output
  });

  try {
    console.log("1. Generar CV");
    console.log("2. Gestionar API Keys");
    console.log("3. Configurar modelos");
    console.log();

    const accion = await rl.question(
      "¿Qué quieres hacer? (1/2/3): "
    );

    if (accion.trim() === "2") {
      await manageApiKeys(rl);
      return;
    }

    if (accion.trim() === "3") {
      await manageModelos(rl);
      return;
    }

    if (
      accion.trim() !== "" &&
      accion.trim() !== "1"
    ) {
      throw new Error(
        "Opción no válida."
      );
    }

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

    const matchAnswer = await rl.question(
      "¿Evaluar match con la oferta? (2ª llamada, S/n): "
    );

    const skipMatch = matchAnswer.trim().toLowerCase() === "n";

    console.log();
    console.log(
      "🤖 Generando CV..."
    );

    const result =
      await generateCV({
        provider: selection.provider,
        model: selection.model,
        skipMatch
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