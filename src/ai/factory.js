import { GeminiProvider } from "./gemini.js";
import { OllamaProvider } from "./ollama.js";

export function createAIProvider(provider) {
  switch (provider) {
    case "gemini":
      return new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY
      });

    case "ollama":
      return new OllamaProvider();

    default:
      throw new Error(
        `Proveedor de IA no soportado: ${provider}`
      );
  }
}