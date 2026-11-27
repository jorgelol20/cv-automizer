import {
    mkdir,
    readFile,
    rename,
    writeFile
} from "node:fs/promises";

import path from "node:path";

import { fileURLToPath } from "node:url";

// Ruta canónica a config/modelos.json.
// Se resuelve desde este archivo para no
// depender del cwd (CLI vs Electron).
// Es configuración local (gitignored),
// sin secretos: modelo + temperaturas + tokens.
const archivoActual = fileURLToPath(
    import.meta.url
);

const raizProyecto = path.resolve(
    path.dirname(archivoActual),
    "..",
    ".."
);

const dirConfig = path.join(
    raizProyecto,
    "config"
);

const rutaModelos = path.join(
    dirConfig,
    "modelos.json"
);

// Solo proveedores con provider real en
// src/ai/factory.js. Ollama incluido
// (su modelo también se configura aquí).
export const PROVIDERS = [
    "opencode-zen",
    "opencode-go",
    "gemini",
    "claude",
    "groq",
    "ollama"
];

export const ETIQUETAS = {
    "opencode-zen": "OpenCode Zen",
    "opencode-go": "OpenCode Go",
    gemini: "Google Gemini",
    claude: "Claude (Anthropic)",
    groq: "Groq",
    ollama: "Ollama"
};

// Campos configurables. `model` guarda el
// favorito por proveedor; el resto son
// temperaturas y topes de tokens. `null`
// significa "heredar de defaults".
export const CAMPOS = [
    "model",
    "temperatureCV",
    "maxTokensCV",
    "temperatureMatch",
    "maxTokensMatch",
    "temperatureGeneral",
    "maxTokensGeneral"
];

const CAMPOS_NUMERICOS = new Set(
    CAMPOS.filter((campo) => campo !== "model")
);

// Defectos actuales del código (src/app.js
// y src/general/generate.js). Son la base
// cuando el JSON no dice otra cosa.
export const DEFAULTS = {
    temperatureCV: 0.2,
    maxTokensCV: 16384,
    temperatureMatch: 0.1,
    maxTokensMatch: 2048,
    temperatureGeneral: 0.3,
    maxTokensGeneral: 4096
};

const RANGOS = {
    temperatureCV: { min: 0, max: 2 },
    temperatureMatch: { min: 0, max: 2 },
    temperatureGeneral: { min: 0, max: 2 },
    maxTokensCV: { min: 512, max: 32768 },
    maxTokensMatch: { min: 512, max: 32768 },
    maxTokensGeneral: { min: 512, max: 32768 }
};

function validarProveedor(provider) {
    if (!PROVIDERS.includes(provider)) {
        throw new Error(
            `Proveedor no soportado: ${provider}. Solo se permiten: ${PROVIDERS.join(", ")}.`
        );
    }
}

function validarCampo(campo) {
    if (!CAMPOS.includes(campo)) {
        throw new Error(
            `Campo no soportado: ${campo}. Solo se permiten: ${CAMPOS.join(", ")}.`
        );
    }
}

// Normaliza un valor para guardar: cadena
// vacía o null limpia el campo (hereda).
// Los numéricos aceptan texto ("0.2").
// Lanza si el valor es inválido.
export function validarValor(campo, valor) {
    validarCampo(campo);

    if (valor === null || valor === undefined) {
        return null;
    }

    if (campo === "model") {
        const texto = String(valor).trim();

        if (!texto) {
            return null;
        }

        if (/\s/.test(texto)) {
            throw new Error(
                "El modelo no puede contener espacios."
            );
        }

        return texto;
    }

    const texto = String(valor).trim().replace(",", ".");

    if (!texto) {
        return null;
    }

    const numero = Number(texto);

    if (!Number.isFinite(numero)) {
        throw new Error(
            `El campo ${campo} debe ser un número.`
        );
    }

    const rango = RANGOS[campo];

    if (numero < rango.min || numero > rango.max) {
        throw new Error(
            `El campo ${campo} debe estar entre ${rango.min} y ${rango.max}.`
        );
    }

    if (campo.startsWith("maxTokens")) {
        return Math.round(numero);
    }

    return numero;
}

function configPorDefecto() {
    return {
        defaults: { ...DEFAULTS },
        providers: {}
    };
}

function normalizar(raw) {
    const base = configPorDefecto();

    if (!raw || typeof raw !== "object") {
        return base;
    }

    // Solo se aceptan campos conocidos;
    // lo desconocido (p. ej. ediciones a mano)
    // se ignora sin romper.
    if (raw.defaults && typeof raw.defaults === "object") {
        for (const campo of Object.keys(DEFAULTS)) {
            try {
                const valor = validarValor(
                    campo,
                    raw.defaults[campo]
                );

                if (valor !== null) {
                    base.defaults[campo] = valor;
                }
            } catch {
                continue;
            }
        }
    }

    if (raw.providers && typeof raw.providers === "object") {
        for (const provider of PROVIDERS) {
            const entrada = raw.providers[provider];

            if (!entrada || typeof entrada !== "object") {
                continue;
            }

            const limpia = {};

            for (const campo of CAMPOS) {
                if (!(campo in entrada)) {
                    continue;
                }

                try {
                    const valor = validarValor(
                        campo,
                        entrada[campo]
                    );

                    if (valor !== null) {
                        limpia[campo] = valor;
                    }
                } catch {
                    continue;
                }
            }

            if (Object.keys(limpia).length > 0) {
                base.providers[provider] = limpia;
            }
        }
    }

    return base;
}

async function leerFichero() {
    await mkdir(dirConfig, { recursive: true });

    let contenido;

    try {
        contenido = await readFile(rutaModelos, "utf8");
    } catch {
        const base = configPorDefecto();

        await writeFile(
            rutaModelos,
            `${JSON.stringify(base, null, 2)}\n`,
            "utf8"
        );

        return base;
    }

    let raw;

    try {
        raw = JSON.parse(contenido);
    } catch {
        throw new Error(
            "config/modelos.json está corrupto (JSON inválido). " +
            "Corrígelo a mano o usa Restablecer para regenerarlo."
        );
    }

    return normalizar(raw);
}

// Escritura atómica (temporal + rename)
// para no dejar medio fichero si CLI y
// Desktop escriben a la vez.
async function escribirFichero(config) {
    await mkdir(dirConfig, { recursive: true });

    const temporal = `${rutaModelos}.tmp`;

    await writeFile(
        temporal,
        `${JSON.stringify(config, null, 2)}\n`,
        "utf8"
    );

    await rename(temporal, rutaModelos);
}

// Vista completa para las UIs: defaults
// efectivos + por proveedor cada campo
// (valor guardado o null si hereda).
export async function getModelosConfig() {
    const config = await leerFichero();

    const providers = {};

    for (const provider of PROVIDERS) {
        const guardado = config.providers[provider] ?? {};
        const vista = {};

        for (const campo of CAMPOS) {
            vista[campo] = guardado[campo] ?? null;
        }

        providers[provider] = {
            etiqueta: ETIQUETAS[provider],
            valores: vista
        };
    }

    return {
        defaults: { ...config.defaults },
        providers
    };
}

export async function setModeloConfig(provider, campo, valor) {
    validarProveedor(provider);

    const normalizado = validarValor(campo, valor);
    const config = await leerFichero();

    config.providers[provider] ??= {};

    if (normalizado === null) {
        // Limpiar equivale a heredar.
        delete config.providers[provider][campo];

        if (
            Object.keys(config.providers[provider]).length === 0
        ) {
            delete config.providers[provider];
        }
    } else {
        config.providers[provider][campo] = normalizado;
    }

    await escribirFichero(config);

    return {
        success: true,
        provider,
        campo,
        valor: normalizado
    };
}

export async function setDefaults(campo, valor) {
    if (!(campo in DEFAULTS)) {
        throw new Error(
            `Defecto no soportado: ${campo}. Solo: ${Object.keys(DEFAULTS).join(", ")}.`
        );
    }

    const normalizado = validarValor(campo, valor);
    const config = await leerFichero();

    if (normalizado === null) {
        config.defaults[campo] = DEFAULTS[campo];
    } else {
        config.defaults[campo] = normalizado;
    }

    await escribirFichero(config);

    return {
        success: true,
        campo,
        valor: config.defaults[campo]
    };
}

export async function resetModeloConfig(provider) {
    const config = await leerFichero();

    if (provider) {
        validarProveedor(provider);
        delete config.providers[provider];
    } else {
        return escribirFichero(configPorDefecto()).then(() => ({
            success: true,
            provider: null
        }));
    }

    await escribirFichero(config);

    return {
        success: true,
        provider
    };
}

// Resolución efectiva para la generación:
// opción explícita > JSON local > defecto.
// Nunca lanza: si el fichero está corrupto
// o ilegible, devuelve los defectos para
// no romper la generación (la pantalla de
// configuración sí mostrará el error).
export async function resolverParamsModelo(provider, overrides = {}) {
    let config;

    try {
        config = await leerFichero();
    } catch {
        config = configPorDefecto();
    }

    const guardado =
        (provider && config.providers[provider]) || {};

    const efectivo = {
        model: guardado.model ?? null
    };

    for (const campo of Object.keys(DEFAULTS)) {
        const explicito = overrides[campo];

        if (
            explicito !== undefined &&
            explicito !== null &&
            explicito !== ""
        ) {
            efectivo[campo] = Number(explicito);
        } else if ((guardado[campo] ?? null) !== null) {
            efectivo[campo] = guardado[campo];
        } else {
            efectivo[campo] = config.defaults[campo];
        }
    }

    return efectivo;
}

// Modelo favorito guardado (o "" si no hay).
// La UI lo preselecciona; la generación lo
// usa solo si no recibe modelo explícito.
export async function resolverModelo(provider) {
    try {
        const config = await leerFichero();

        return config.providers[provider]?.model ?? "";
    } catch {
        return "";
    }
}
