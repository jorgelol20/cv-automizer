import {
    readFile,
    writeFile
} from "node:fs/promises";

import path from "node:path";

import { fileURLToPath } from "node:url";

// Ruta canónica al .env del proyecto.
// Se resuelve desde este archivo para no
// depender del cwd (CLI vs Electron).
const archivoActual = fileURLToPath(
    import.meta.url
);

const raizProyecto = path.resolve(
    path.dirname(archivoActual),
    "..",
    ".."
);

const rutaEnv = path.join(
    raizProyecto,
    ".env"
);

// Catálogo único de claves soportadas.
// Solo proveedores con provider real en
// src/ai/factory.js: gemini, opencode-zen,
// opencode-go, claude y groq.
// Ollama no usa key. OpenAI está en
// .env.example pero no tiene provider.
export const KEY_DEFS = [
    {
        name: "OPENCODE_ZEN_API_KEY",
        provider: "opencode-zen",
        etiqueta: "OpenCode Zen",
        aliasLectura: ["OPENCODE_API_KEY"],
        ayuda: "Consigue la clave en https://opencode.ai/auth"
    },
    {
        name: "OPENCODE_GO_API_KEY",
        provider: "opencode-go",
        etiqueta: "OpenCode Go",
        aliasLectura: ["OPENCODE_API_KEY"],
        ayuda: "Suscripción en https://opencode.ai/console/go"
    },
    {
        name: "GEMINI_API_KEY",
        provider: "gemini",
        etiqueta: "Google Gemini",
        aliasLectura: [],
        ayuda: "Clave gratuita de Google AI Studio"
    },
    {
        name: "ANTHROPIC_API_KEY",
        provider: "claude",
        etiqueta: "Claude (Anthropic)",
        aliasLectura: ["CLAUDE_API_KEY"],
        ayuda: "Consigue la clave en https://console.anthropic.com/"
    },
    {
        name: "GROQ_API_KEY",
        provider: "groq",
        etiqueta: "Groq",
        aliasLectura: [],
        ayuda: "Consigue la clave en https://console.groq.com/keys"
    }
];

const NOMBRES_PERMITIDOS = new Set(
    KEY_DEFS.map((def) => def.name)
);

function buscarDef(nombre) {
    return KEY_DEFS.find(
        (def) => def.name === nombre
    ) ?? null;
}

// Muestra solo los últimos 4 caracteres.
// Nunca se devuelve el valor completo
// en listados ni en logs.
export function maskKey(valor) {
    const texto = String(valor ?? "");

    if (!texto) {
        return "";
    }

    if (texto.length <= 4) {
        return "****";
    }

    return `******${texto.slice(-4)}`;
}

function plantillaEnv() {
    return [
        "# Generado por CV Automizer (sección API Keys)",
        "# Solo claves de proveedores soportados.",
        "",
        "OPENCODE_ZEN_API_KEY=",
        "OPENCODE_GO_API_KEY=",
        "GEMINI_API_KEY=",
        "ANTHROPIC_API_KEY=",
        "GROQ_API_KEY=",
        ""
    ].join("\n");
}

async function asegurarEnv() {
    try {
        await readFile(rutaEnv, "utf8");

        return;
    } catch {
        await writeFile(
            rutaEnv,
            plantillaEnv(),
            "utf8"
        );
    }
}

function parsearLineas(contenido) {
    const mapa = new Map();

    for (const linea of contenido.split("\n")) {
        const coincidencia = linea.match(
            /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/
        );

        if (!coincidencia) {
            continue;
        }

        const nombre = coincidencia[1];
        let valor = coincidencia[2] ?? "";

        // Quitar comillas simples o dobles si las hay.
        if (
            valor.length >= 2 &&
            ((valor.startsWith('"') &&
                valor.endsWith('"')) ||
                (valor.startsWith("'") &&
                    valor.endsWith("'")))
        ) {
            valor = valor.slice(1, -1);
        }

        // La última aparición gana.
        mapa.set(nombre, valor);
    }

    return mapa;
}

function leerValor(mapa, def) {
    const candidatos = [
        def.name,
        ...def.aliasLectura
    ];

    for (const nombre of candidatos) {
        const enArchivo = mapa.get(nombre) ?? "";

        if (enArchivo.trim()) {
            return {
                valor: enArchivo.trim(),
                origen: ".env",
                nombreEncontrado: nombre
            };
        }
    }

    for (const nombre of candidatos) {
        const enEntorno =
            process.env[nombre] ?? "";

        if (String(enEntorno).trim()) {
            return {
                valor: String(
                    enEntorno
                ).trim(),
                origen: "entorno",
                nombreEncontrado: nombre
            };
        }
    }

    return {
        valor: "",
        origen: "no configurada",
        nombreEncontrado: def.name
    };
}

export async function getKeysStatus() {
    await asegurarEnv();

    const contenido = await readFile(
        rutaEnv,
        "utf8"
    );

    const mapa = parsearLineas(contenido);

    return KEY_DEFS.map((def) => {
        const lectura = leerValor(
            mapa,
            def
        );

        const configurada =
            Boolean(lectura.valor);

        return {
            name: def.name,
            provider: def.provider,
            etiqueta: def.etiqueta,
            ayuda: def.ayuda,
            configured: configurada,
            masked: configurada
                ? maskKey(lectura.valor)
                : "",
            source: configurada
                ? lectura.origen
                : "no configurada"
        };
    });
}

function validarNombre(nombre) {
    if (!NOMBRES_PERMITIDOS.has(nombre)) {
        throw new Error(
            `Clave no soportada: ${nombre}. Solo se permiten: ${[...NOMBRES_PERMITIDOS].join(", ")}.`
        );
    }
}

function validarValor(valor) {
    if (typeof valor !== "string") {
        throw new Error(
            "El valor debe ser texto."
        );
    }

    const limpio = valor.trim();

    if (!limpio) {
        throw new Error(
            "El valor está vacío."
        );
    }

    if (/[\s]/.test(limpio)) {
        throw new Error(
            "La clave no puede contener espacios ni saltos de línea."
        );
    }

    return limpio;
}

async function escribirValor(nombre, valor) {
    await asegurarEnv();

    const contenido = await readFile(
        rutaEnv,
        "utf8"
    );

    const lineas = contenido.split("\n");
    let encontrada = false;

    const nuevas = lineas.map((linea) => {
        const coincidencia =
            linea.match(
                /^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/
            );

        if (
            !coincidencia ||
            coincidencia[2] !== nombre
        ) {
            return linea;
        }

        encontrada = true;

        return `${coincidencia[2]}=${valor}`;
    });

    if (!encontrada) {
        if (
            nuevas.length > 0 &&
            nuevas[nuevas.length - 1].trim() !==
                ""
        ) {
            nuevas.push("");
        }

        nuevas.push(`${nombre}=${valor}`);
    }

    let final = nuevas.join("\n");

    if (!final.endsWith("\n")) {
        final += "\n";
    }

    await writeFile(rutaEnv, final, "utf8");

    process.env[nombre] = valor;
}

export async function setKey(nombre, valor) {
    validarNombre(nombre);

    const limpio = validarValor(valor);

    await escribirValor(nombre, limpio);

    return {
        success: true,
        name: nombre,
        masked: maskKey(limpio)
    };
}

export async function clearKey(nombre) {
    validarNombre(nombre);

    await escribirValor(nombre, "");

    if (process.env[nombre]) {
        delete process.env[nombre];
    }

    return {
        success: true,
        name: nombre
    };
}
