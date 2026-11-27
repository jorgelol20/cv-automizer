// Servicios de la TUI: catálogo de proveedores,
// listado de modelos (el mismo que usa la CLI)
// y apertura de ficheros con la aplicación del
// sistema. No contiene estado de UI.

import { spawn } from "node:child_process";

import { listClaudeModels } from "../ai/claude.js";
import { listGeminiModels } from "../ai/gemini.js";
import { listGroqModels } from "../ai/groq.js";
import { listOllamaModels } from "../ai/ollama.js";
import { listOpencodeGoModels } from "../ai/opencode-go.js";
import { listOpencodeModels } from "../ai/opencode.js";

export const PROVIDERS = [
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

export const LAYOUTS = [
    {
        id: "standard",
        name: "Layout: estándar"
    },
    {
        id: "one-page",
        name: "Layout: one page"
    }
];

export function nombreProveedor(providerId) {
    return (
        PROVIDERS.find(
            (provider) => provider.id === providerId
        )?.name ?? providerId
    );
}

// Mismo contrato que la CLI: devuelve la lista
// normalizada de cada proveedor. Lee process.env
// en el momento de llamar para que un cambio de
// clave en la pestaña API Keys surta efecto ya.
export async function listModels(providerId) {
    switch (providerId) {
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
                `Proveedor desconocido: ${providerId}`
            );
    }
}

// Abre una ruta con la aplicación por defecto
// sin bloquear la TUI (proceso hijo desacoplado).
export function abrirRuta(ruta) {
    const plataforma = process.platform;

    const lanzar = (comando, argumentos) => {
        const hijo = spawn(comando, argumentos, {
            detached: true,
            stdio: "ignore",
            windowsHide: true
        });

        // Sin este listener, un fallo al abrir la
        // aplicación del sistema tumbaría la TUI.
        hijo.on("error", () => {});
        hijo.unref();
    };

    if (plataforma === "win32") {
        lanzar("cmd", ["/c", "start", "", ruta]);
        return;
    }

    lanzar(
        plataforma === "darwin" ? "open" : "xdg-open",
        [ruta]
    );
}
