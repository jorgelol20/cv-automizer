import { ClaudeProvider } from "./claude.js";
import { GeminiProvider } from "./gemini.js";
import { GroqProvider } from "./groq.js";
import { OllamaProvider } from "./ollama.js";
import { OpenCodeGoProvider } from "./opencode-go.js";
import { OpenCodeZenProvider } from "./opencode.js";

export function createAIProvider(provider, options = {}) {
  switch (provider) {
    case "gemini":
      return new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY
      });

    case "claude":
      return new ClaudeProvider({
        apiKey:
          options.apiKey ||
          process.env.ANTHROPIC_API_KEY ||
          process.env.CLAUDE_API_KEY
      });

    case "ollama":
      return new OllamaProvider();

    case "groq":
      return new GroqProvider({
        apiKey:
          options.apiKey ||
          process.env.GROQ_API_KEY
      });

    case "opencode-zen":
      return new OpenCodeZenProvider({
        apiKey:
          options.apiKey ||
          process.env.OPENCODE_ZEN_API_KEY ||
          process.env.OPENCODE_API_KEY
      });

    case "opencode-go":
      return new OpenCodeGoProvider({
        apiKey:
          options.apiKey ||
          process.env.OPENCODE_GO_API_KEY ||
          process.env.OPENCODE_API_KEY
      });

    default:
      throw new Error(
        `Proveedor de IA no soportado: ${provider}`
      );
  }
}