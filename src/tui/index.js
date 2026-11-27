// Entrada de la TUI.
//
// Requiere Node.js >= 26.4 con --experimental-ffi
// (el script `npm run tui` ya lo añade) o Bun >= 1.3.
// OpenTUI carga una librería nativa: si el runtime
// no la soporta se explica cómo arrancar y se sale
// sin tocar el terminal.
//
// El chequeo de versión va ANTES de importar
// @opentui/core para no fallar con un error nativo
// en runtimes antiguos.

import "dotenv/config";

import { COLORS, MIN_COLS, MIN_ROWS } from "./theme.js";

let rendererActivo = null;

function restaurarTerminal() {
    try {
        rendererActivo?.destroy();
    } catch {
        // Ya estaba destruido.
    }

    rendererActivo = null;
}

function salirConError(error) {
    restaurarTerminal();

    console.error();
    console.error("❌ Error en la TUI:");
    console.error(error?.stack ?? error);

    process.exit(1);
}

process.on("uncaughtException", salirConError);
process.on("unhandledRejection", salirConError);
process.on("SIGTERM", () => {
    restaurarTerminal();
    process.exit(0);
});

function versionSoportada() {
    if (typeof Bun !== "undefined") {
        return true;
    }

    const [mayor, menor] = process.versions.node
        .split(".")
        .map((parte) => Number.parseInt(parte, 10));

    return mayor > 26 || (mayor === 26 && menor >= 4);
}

if (!versionSoportada()) {
    console.error(
        `La TUI requiere Node.js 26.4 o superior (detectado ${process.version}).`
    );
    console.error(
        "Usa `npm run tui` con Node 26.4+ (incluye --experimental-ffi) o Bun 1.3+."
    );
    console.error(
        "La CLI (`npm start`) y el escritorio (`npm run desktop`) siguen funcionando con Node 20+."
    );
    process.exit(1);
}

let createCliRenderer;
let crearApp;

try {
    ({ createCliRenderer } = await import("@opentui/core"));
    ({ crearApp } = await import("./app.js"));
} catch (error) {
    console.error();
    console.error("❌ No se pudo cargar OpenTUI.");
    console.error(error?.message ?? error);
    process.exit(1);
}

try {
    rendererActivo = await createCliRenderer({
        exitOnCtrlC: false,
        backgroundColor: COLORS.bg
    });
} catch (error) {
    rendererActivo = null;

    console.error();
    console.error("❌ No se pudo iniciar OpenTUI.");
    console.error(error?.message ?? error);
    console.error();
    console.error("Comprueba que arrancas con el flag de FFI:");
    console.error(
        "  npm run tui            (Node 26.4+ con --experimental-ffi)"
    );
    console.error("  bun src/tui/index.js   (Bun 1.3+)");

    process.exit(1);
}

const instancia = crearApp(rendererActivo, {
    alSalir: () => process.exit(0)
});

const columnas = process.stdout.columns ?? MIN_COLS;
const filas = process.stdout.rows ?? MIN_ROWS;

if (columnas < MIN_COLS || filas < MIN_ROWS) {
    instancia.app.setStatus(
        `Terminal pequeña (${columnas}x${filas}): usa al menos ${MIN_COLS}x${MIN_ROWS} para ver todo.`,
        "warn"
    );
}
