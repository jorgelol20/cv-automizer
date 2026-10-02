import { GeminiProvider } from "./gemini.js";
import { OllamaProvider } from "./ollama.js";
import { OpenCodeZenProvider } from "./opencode.js";

export function createAIProvider(provider, options = {}) {
  switch (provider) {
    case "gemini":
      return new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY
      });

    case "ollama":
      return new OllamaProvider();

    case "opencode-zen":
      return new OpenCodeZenProvider({
        apiKey:
          options.apiKey ||
          process.env.OPENCODE_ZEN_API_KEY ||
          process.env.OPENCODE_API_KEY
      });

    default:
      throw new Error(
        `Proveedor de IA no soportado: ${provider}`
      );
  }
}